
// ONE OFF SCRIPT // 

/* ---------------- */
/* Create NFL Teams */
/* ---------------- */


/* 3rd Party Modules */
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session')
var RedisStore = require('connect-redis')(session);

global._ = require('underscore');
global.helpers = require('../helpers');

/* Database */
var db = require('../models');

/* Routes */
var api = require('../routes/api');
var views = require('../routes/views');



var teams_by_division = {

	"AFC": {
		"North": [
			{
				"long_name": "Baltimore Ravens",
				"short_name": "Ravens",
				"logo": null
			},
			{
				"long_name": "Cincinnati Bengals",
				"short_name": "Bengals",
				"logo": null
			},
			{
				"long_name": "Cleveland Browns",
				"short_name": "Browns",
				"logo": null
			},
			{
				"long_name": "Pittsburgh Steelers",
				"short_name": "Steelers",
				"logo": null
			}
		],
		"South": [
			{
				"long_name": "Houston Texans",
				"short_name": "Texans",
				"logo": null
			},
			{
				"long_name": "Indianapolis Colts",
				"short_name": "Colts",
				"logo": null
			},
			{
				"long_name": "Jacksonville Jaguars",
				"short_name": "Jaguars",
				"logo": null
			},
			{
				"long_name": "Tennessee Titans",
				"short_name": "Titans",
				"logo": null
			}
		],
		"East":  [
			{
				"long_name": "Buffalo Bills",
				"short_name": "Bills",
				"logo": null
			},
			{
				"long_name": "Miami Dolphins",
				"short_name": "Dolphins",
				"logo": null
			},
			{
				"long_name": "New England Patriots",
				"short_name": "Patriots",
				"logo": null
			},
			{
				"long_name": "New York Jets",
				"short_name": "Jets",
				"logo": null
			}
		], 
		"West":  [
			{
				"long_name": "Denver Broncos",
				"short_name": "Broncos",
				"logo": null
			},
			{
				"long_name": "Kansas City Chiefs",
				"short_name": "Chiefs",
				"logo": null
			},
			{
				"long_name": "Oakland Raiders",
				"short_name": "Raiders",
				"logo": null
			},
			{
				"long_name": "San Diego Chargers",
				"short_name": "Chargers",
				"logo": null
			}
		]
	},

	"NFC": {
		"North": [
			{
				"long_name": "Chicago Bears",
				"short_name": "Bears",
				"logo": null
			},
			{
				"long_name": "Detroit Lions",
				"short_name": "Lions",
				"logo": null
			},
			{
				"long_name": "Green Bay Packers",
				"short_name": "Packers",
				"logo": null
			},
			{
				"long_name": "Minnesota Vikings",
				"short_name": "Vikings",
				"logo": null
			}
		],
		"South": [
			{

				"long_name": "Atlanta Falcons",
				"short_name": "Falcons",
				"logo": null
			},
			{
				"long_name": "Carolina Panthers",
				"short_name": "Panthers",
				"logo": null
			},
			{
				"long_name": "New Orleans Saints",
				"short_name": "Saints",
				"logo": null
			},
			{
				"long_name": "Tampa Bay Buccaneers",
				"short_name": "Buccaneers",
				"logo": null
			}
		],
		"East":  [
			{
				"long_name": "Dallas Cowboys",
				"short_name": "Cowboys",
				"logo": null
			},
			{
				"long_name": "New York Giants",
				"short_name": "Giants",
				"logo": null
			},
			{
				"long_name": "Philadelphia Eagles",
				"short_name": "Eagles",
				"logo": null
			},
			{
				"long_name": "Washington Redskins",
				"short_name": "Redskins",
				"logo": null
			}
		], 
		"West":  [
			{
				"long_name": "Arizona Cardinals",
				"short_name": "Cardinals",
				"logo": null
			},
			{
				"long_name": "St. Louis Rams",
				"short_name": "Rams",
				"logo": null
			},
			{
				"long_name": "San Francisco 49ers",
				"short_name": "49ers",
				"logo": null
			},
			{
				"long_name": "Seattle Seahawks",
				"short_name": "Seahawks",
				"logo": null
			}
		]
	}
}
var all_teams = [];


for (var division in teams_by_division) {
	for (var sub_division in teams_by_division[division]) {

		var teams_in_division = teams_by_division[division][sub_division]
		teams_in_division.forEach(function(team) {
			team.division = division;
			team.sub_division = sub_division;
			all_teams.push(team);
		});
	};
};

var counter = all_teams.length;
all_teams.forEach(function(team) {
	db.Team.create(team).success(function(new_team) {
		console.log("Created: ",new_team.values);

		if (--counter == 0) {
			console.log("\n\n[---Done---]\n\n");
			process.exit();
		}
	});
});



