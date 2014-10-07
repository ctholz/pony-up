
/* Express Modules */
var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var crypto = require('crypto');

var initializer = require('./initializer')

/* 3rd Party Modules */
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session')
var RedisStore = require('connect-redis')(session);

global._ = require('underscore');
global.helpers = require('./helpers');
global.mailer = require('./mailer');

/* Database */
var db = require('./models');

/* Routes */
var api = require('./routes/api');
var views = require('./routes/views');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', process.env.PORT || 7654);


app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: "foobar", 
    store: new RedisStore({ client: db.client })
}));

app.use(passport.initialize());
app.use(passport.session());

// used by passport to check for the user in a given session
passport.serializeUser(function(user, done) { done(null, user.id); });
passport.deserializeUser(function(id, done) {
    db.User.find({where: {id: id }}).complete(function(err,user) { 
        done(err,user);
    });
});


/* -------------------- */
/* --     Routes     -- */
/* -------------------- */

/* View Routes */

// NOTE -- all regular views must call 'fetchBasics' middleware or will JS bug
app.get('/welcome', fetchBasics, fetchTeams, fetchOdds, views.picker);
app.get('/', fetchBasics, fetchTeams, fetchOdds, function(req,res) {
    if (req.isAuthenticated())
        views.lobby(req,res);
    else
        views.picker(req,res);
});
app.get('/picker', fetchBasics, fetchTeams, fetchOdds, views.picker);
app.get('/lobby', fetchBasics, views.lobby);
app.get('/create', fetchBasics, views.create_league);
app.get('/dashboard/:lid', ensureAuthenticated, fetchBasics, fetchTeams, fetchOdds, views.dashboard);
app.get('/sign_up', newbOnly, fetchBasics, views.sign_up);
app.get('/admin/:pw', fetchBasics, passwordProtected, views.admin);

app.get('/logout', views.logout);

/* API Routes */
app.get('/api/sign_in', passport.authenticate('local', { failureRedirect: '/?error=sign-in'}), api.sign_in);
app.post('/api/create_league', api.create_league)
app.post('/api/sign_up', api.sign_up);
app.post('/api/join_league', api.join_league);
app.post('/api/set_picks', api.set_picks);
app.post('/api/set_odds', fetchTeams, api.set_odds);

// DEV DEV DEV //
app.get('/test', api.test);

/* 404 Handler */
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});




// - Local Strategy - //
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
    },
    function(username, password, done) {
        var hash = crypto.createHash('sha256').update(password).digest('hex');
        db.User.find({where: { email: username.toLowerCase(), password: hash }}).complete(function(err, user) {
            console.log("\nFound::",user)
            if (err)
                return done(err);
            if (!user) {
                return done(null, false, { message: "Email/password combination isn't correct."});
            } 
            return done(null, user);
        });
    }
));


/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;


// Start server
db.sequelize.sync().complete(function(err) {
    if (err) throw err;

    var server = http.createServer(app);
    server.listen(app.get('port'), function(){
        console.log('Express server listening on port ' + app.get('port'))
        // set dev or production env variable
        global.dev = (app.get('env') == 'development' && !('HEROKU_POSTGRESQL_GOLD_URL' in process.env)) ? true : false;  
    });
});

/* Middleware -- taken straight from B&B */
function ensureAuthenticated(req, res, next) {

    if (req.isAuthenticated() && req.session) {
        res.locals.user = req.user;
        return next();
    }
    else
        res.redirect('/')
};

/* Middleware - does the opposite of ensureAuthenticated */
function newbOnly(req, res, next) {
    if (req.isAuthenticated() && req.session)
        res.redirect('/lobby')
    else
        next();
};

function fetchBasics(req, res, next) {
    // Set defaults
    res.locals.week_of_season = CONSTANTS.WEEK_OF_SEASON;
    res.locals.WEEK_OF_SEASON = CONSTANTS.WEEK_OF_SEASON;
    res.locals.WEEKS_REMAINING = CONSTANTS.WEEKS_IN_SEASON - CONSTANTS.WEEK_OF_SEASON;

    res.locals.my_leagues = []
    res.locals.my_weekly_picks = []
    res.locals.has_picked = false
    res.locals.user = null

    if (req.user) {
        res.locals.user = req.user

        req.user.getLeagues().success(function(leagues) {
            console.log('FETCHING:: ',leagues)
            res.locals.my_leagues = leagues || [];

            db.Pick.find({where: {status: "active", week: CONSTANTS.WEEK_OF_SEASON, UserId: req.user.id}}).success(function(picks) {
                res.locals.my_weekly_picks = picks || [];
                res.locals.has_picked = (picks != null);

                next(); 
            });
        });
    } else
        next();
};

/* Middleware -- fetches all NFL teams */
function fetchTeams(req, res, next) {
    db.Team.findAll({where:{status:'active'}}).success(function(teams) {
        res.locals.teams = teams.map(function(team) {
            // Augment obj with logo path
            team = team.values;
            team.logo_path = helpers.getLogoPathForTeamName(team.short_name);
            return team;
        });
        return next();
    });
};

/* Middleware -- fetches all odds and appends this weeks odds to teams
     MUST BE CALLED AFTER "fetchTeams" */
function fetchOdds(req, res, next) {
    db.Odd.findAll().success(function(odds) {

        var counter = odds.length;
        if (counter == 0) return next();

        res.locals.odds = [];
        var this_week_odds = [];

        odds.forEach(function(odds_obj) {
            if (odds_obj.week == CONSTANTS.WEEK_OF_SEASON)
                this_week_odds.push(odds_obj.values);
            
            if (res.locals.odds[odds_obj.week]) res.locals.odds[odds_obj.week].push(odds_obj.values)
            else res.locals.odds[odds_obj.week] = [odds_obj.values];

            if (--counter == 0) {
                res.locals.teams = helpers.appendOddsToTeams(res.locals.teams, this_week_odds);
                return next();
            }
        });
    });
};

/* Middleware -- checks params against master password */
function passwordProtected(req, res, next) {
    if (req.params.pw != CONSTANTS.MASTER_PASSWORD)
        return res.json({success: false, status: 403, error: "Get outta here."})
    else 
        return next();
};




