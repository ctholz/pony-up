

// - One-off - //

/* ------------------- */
/*	 Copy Over Odds 	*/
/* ------------------- */

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


function main() {

	// Get last week's odds
	db.Odd.findAll({where:{week:CONSTANTS.WEEK_OF_SEASON - 1}}).success(function(odds) {
		var count = odds.length;

		odds.forEach(function(odd) {
			odd = odd.values

			db.Odd.create({
				odds: 	odd.odds,
				status: odd.status,
				week: 	CONSTANTS.WEEK_OF_SEASON,
				TeamId: odd.TeamId
			}).success(function(new_odd) {
				console.log('New odd created... ',new_odd.values);

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
        console.log("Copying over odds...");
        // set dev or production env variable
        global.dev = (app.get('env') == 'development' && !('HEROKU_POSTGRESQL_GOLD_URL' in process.env)) ? true : false;  
    
   		main();	
    });
});