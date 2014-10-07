
// - Cron - // 

/* ------------------- */
/* Picking Window Open */
/* ------------------- */


/* 
	Sends out email to all active players about picking window opening

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


// Grab all users, send them an email
function main() {
	db.User.findAll({where:{status:'active'}}).success(function(users) {
		var count = users.length;

		users.forEach(function(user) {
			mailer.sendWindowOpenEmail(user, function() {
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
   		
   		// Only run on Tuesday
        var d = new Date();
        if (d.getDay() != 2) {
        	console.log('CRON - window_opening_alert - not Tuesday, sleepy time.')
        	process.exit()
        } else
   			main();
    });
});