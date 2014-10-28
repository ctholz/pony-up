

// - Cron - //

/* --------------------- */
/* Picking Window Closed */
/* --------------------- */

/*
	Actually does the work of copying over picks for those who haven't picked this week
		passes on users who have picked

*/


/* Express Modules */
var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var crypto = require('crypto');

/* 3rd Party Modules */
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session')
var RedisStore = require('connect-redis')(session);

global._ = require('underscore');
global.helpers = require('../helpers');
global.mailer = require('../mailer');

var app = express();

/* Database */
var db = require('../models');

/* Routes */
var api = require('../routes/api');
var views = require('../routes/views');
var initializer = require('../initializer');


// Input: user
	// Output: checks if user has picks for this week. If not, copies over from last week
function processUsersPicks(user, week, callback) {
	db.Pick.find({where:{ UserId: user.id, week: week }}).success(function(pick) {
		if (pick) {
			console.log("[",user.email,"] has picked, returning.");
			return callback();
		} else {

			// Get last week's picks
			db.Pick.find({where:{ UserId: user.id, week: week - 1}}).success(function(last_week_pick) {

				if (!last_week_pick)
					return callback("["+user.email+"] No picks for last week - " + (week - 1) + " - found.")
				
				// Create this week's picks
				db.Pick.create({
					picks: 		last_week_pick.picks,
					status: 	'active',
					week: 		week,
					UserId: 	user.id,
				}).success(function(pick_set) {
					console.log("COPYING PICKS FOR [",user.email,"] - Done.");
					callback(null, pick_set);
				}).error(function(err) { 
					callback(err);
				});
			});
		}
	});
};

function main(week) {

	db.User.findAll({where:{status:'active'}}).success(function(users) {
		var count = users.length;

		users.forEach(function(user) {

			processUsersPicks(user, week, function(err) {
				if (err)
					console.log("	ERROR - ",err);

				if (--count == 0) {
					console.log("[---Done---]\n");
					process.exit();
				}
			});
		});
	});
};


// Start server
db.sequelize.sync().complete(function(err) {
    if (err) throw err;

    var server = http.createServer(app);
    server.listen(app.get('port'), function(){
        console.log('Express server listening on port ' + app.get('port'))
        // set dev or production env variable
        global.dev = (app.get('env') == 'development' && !('HEROKU_POSTGRESQL_GOLD_URL' in process.env)) ? true : false;  
    
        // 
        var WEEK_OVERRIDE = (process.argv.length > 2) ? parseInt(process.argv[2]) : CONSTANTS.WEEK_OF_SEASON;
        main(WEEK_OVERRIDE)
   		// // Only run on Tuesday
     //    var d = new Date();
     //    if (d.getDay() != 4) {
     //    	console.log('CRON - window_closed - not Thursday, sleepy time.')
     //    	process.exit()
     //    } else
   		// 	main(WEEK_OVERRIDE);


    });
});