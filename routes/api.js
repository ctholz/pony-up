
/* ------------------------ */
/* --     API Router     -- */
/* ------------------------ */


exports.test = function(req,res) {
	db.Team.findAll({where: {status: 'active'}, attributes: ['short_name', 'id'] }).success(function(teams) {
		var picks = ["AFC-North-Bengals", "AFC-South-Colts", "AFC-East-Dolphins", "AFC-West-Chiefs", "NFC-North-Packers", "NFC-South-Saints", "NFC-East-Eagles", "NFC-West-49ers", "AFC-WC1-Browns", "AFC-WC2-Jaguars", "NFC-WC1-Vikings", "NFC-WC2-Buccaneers"]

		res.json({result: helpers.formatPicksForDB(teams, picks) });
	});
};


exports.set_picks = function(req, res) {

	var picks = req.body.selections,
		week = req.body.week,
		lid = req.body.lid;

	var callback = function(err, picks) {
		if (err) {
			console.error("___ERROR___: createPicks callback - ",err);
			return res.json({success: false});
		} else {
			console.log("___SUCCESS___: picks set - ",picks.values);
			return res.json({success: true });
		}
	};

	// If existing pick, destroy it, otherwise create new
	db.Pick.find({where: { week: CONSTANTS.WEEK_OF_SEASON, UserId: req.user.id }}).success(function(pick) {
		if (pick) {
			pick.destroy().success(function() {
				console.log("Destroyed old picks for [",req.user.fullName(),"] Week: ",CONSTANTS.WEEK_OF_SEASON);
				createPicks(picks, req.user, week, lid, callback);
			});
		} else {
			createPicks(picks, req.user, week, lid, callback);
		}
	});
};

/* API - takes giant stringified odds object from admin and saves as entries in DB */
exports.set_odds = function(req, res) {
	var odds = JSON.parse(req.body.odds),
		teams = res.locals.teams; // fetched from middleware

	var ctr = teams.length;
	teams.forEach(function(team) {
		var odds_for_team = odds[team.id];
		console.log('Odd for ',team.short_name,' -- ',odds_for_team,"  :: ",helpers.formatOddsForDB(odds_for_team));


		db.Odd.find({where: { week: CONSTANTS.WEEK_OF_SEASON, TeamId: team.id }}).success(function(old_odd) {
			
			var callback = function() {
				console.log("Odd added for [",team.short_name,"]");
				if (--ctr == 0)
					return res.json({success: true});
			},
				odd_data = {
					week: 			CONSTANTS.WEEK_OF_SEASON,
					odds: 			helpers.formatOddsForDB(odds_for_team),
					status: 		'active',
					TeamId: 		team.id
			}

			if (old_odd) {
				old_odd.destroy().success(function() {
					console.log("Destroyed old odd for [",team.short_name,"]");
					createOdd(odd_data, callback);
				});
			} else
				createOdd(odd_data, callback);
		});
	});

	function createOdd(odd,callback) {
		db.Odd.create(odd).success(function(new_odd) {
			callback();
		});
	};
};

/* API - sets W/L record for all teams based on admin input */
exports.set_records = function(req, res) {
	var records = JSON.parse(req.body.records);
	console.log("Records:: ",records);

	db.Team.findAll().success(function(teams) {
		var counter = Object.keys(records).length;
		teams.forEach(function(team) {

			console.log(records[team.id].wins, records[team.id])

			if (team.id in records) {
				team.updateAttributes({
					wins: 	parseInt(records[team.id].wins),
					losses: parseInt(records[team.id].losses)
				}).success(function() {
					console.log("Updated W/L for [",team.short_name,"] ",team.record());
					if (--counter == 0)
						return res.json({success: true})
				}).error(function(err) {
					console.error("ERROR - saving records from admin - ",err);
					return res.json({success:false, error: "DB"})
				});
			}
		});
	});
};

/* API - signs a user in (logic handled by passport middleware) */
exports.sign_in = function(req, res) {
	return res.redirect("/lobby")
}; 

/* API - creates a new user + redirects */
exports.sign_up = function(req, res) {

	//var	favoriteTeam = req.body.favoriteTeam, /* UNUSED */
	var crypto = require('crypto'),
		hashed_pw = crypto.createHash('sha256').update(req.body.password.trim()).digest('hex'),
		in_onboarding = req.body.in_onboarding;

	function _error(err) {
		console.log("Err - ",err);
		return res.json({success:false, error: err.text})
	};

	function _createUser() {


		db.User.create({
			first_name:  req.body.firstName.trim(),
			last_name: 	 req.body.lastName.trim(),
			password: 	 hashed_pw,
			email: 		 req.body.email.trim().toLowerCase(),
			// TODO : favorite team
		}).success(function(user) {
			req.logIn(user, function(err) {
				if (err) throw err;

				mailer.sendWelcomeEmail(user);

				if (in_onboarding === "true") {
					var makeSelections = function(err) {
						if (typeof err !== "undefined" && err)
							return res.json({success: false, error: err});

						// Unparse stringified selections
						var selections = JSON.parse(req.body.selections);

						createPicks(selections, user, CONSTANTS.WEEK_OF_SEASON, req.body.league_id, function(err, picks) {
							if (err) {
								console.error("___ERROR___: createPicks callback - ",err);
								return res.json({success: false, error: { text: "Something went wrong saving your picks. Please try again."}});
							} else {
								console.log("___SUCCESS___: picks set - ",picks.values);
								return res.json({success:true, next:'/dashboard/' + req.body.league_id});
							}
						})
					}

					// Create or join league
					if (req.body.is_commissioner) {
						createAndJoinLeague(user, req.body.league_id, makeSelections);
					} else {
						joinLeague(user, req.body.league_id, makeSelections);
					}
				} else {
					return res.json({success:true, next: '/lobby'});
				}
			});
		});
	};

	// Space validation
	if (req.body.firstName.length == 0 || req.body.lastName.length == 0 || req.body.password.length == 0 || req.body.email.length == 0)
		return _error({field:null, text:'No spaces, please.'});

	db.User.find({where:{ email: req.body.email.trim().toLowerCase() }}).success(function(user) {
		if (user) return _error({field: "email", text: "There's already a Pony Up user registered with that email address, please use another."})

		return _createUser();
	});
};

/* API - creates a new league + redirects */
exports.create_league = function(req, res) {

	var name = req.body.title || null,
		password = req.body.password,
		user_exists = (typeof req.user !== "undefined")

	function _error(err) {
		return res.render("create_league", { errors: [err] });
	};

	if (!name)
		return _error({field: "title", text:"Missing title"});

	db.League.find({where:{title: name}}).success(function(league) {
		if (league)
			return _error({field: "title", text:"A league with this title already exists. Please choose another."})

		// Create league with or without user
		db.League.create({
			title: 		name,
			password:   password || null,
			UserId: 	(user_exists) ? req.user.id : null
		}).success(function(league) {

			if (user_exists) {
				league.addPlayer(req.user).success(function() {
					// Test
					league.getPlayers().success(function(players) {
						console.log("LEAGUE NOW HAS ",players.length," PLAYERS\n\n");

						req.user.addLeague(league).success(function() {
							return res.redirect("/dashboard/" + league.id);
						});
					});
				});
			} else {
				// Obfuscate league id
				var btoa = require('btoa');
				return res.redirect("/sign_up?lid=" + btoa(league.id));
			};
		});
	});
};

/* API - join league (from lobby) */
exports.join_league = function(req, res) {

	// ** note ** user may be undefined here, in which case just checking for password equality

	var league_id = req.body.league_id,
		password = req.body.password;

	if (password == "") password = null;

	// Dumb validation
	if (!league_id || isNaN(parseInt(league_id)))
		return res.json({success:false, error:"params"});

	db.League.find({where:{id:league_id}}).success(function(league) {
		if (!league)
			return res.json({success:false, error:"missing league"});

		if (league.password !== password)
			return res.json({success:false, error:"incorrect password"});

		if (typeof req.user != "undefined") {

			league.addPlayer(req.user).success(function() {
				req.user.addLeague(league).success(function() {
					return res.json({ success: true });
				});
			});
		} else {
			return res.json({ success: true });
		}
	});
};

// API - creates match objects (all Redis)
exports.set_matches = function(req, res) {
	var matches = JSON.parse(req.body.matches),
		new_match_ids = [],
		week_key = "week_" + CONSTANTS.WEEK_OF_SEASON + "_team_matches";
	
	console.log("Adding Matches for [", week_key,"]::",matches);

	// Go
	clear_old_state();

	function _error(msg) {
		return res.json({success: false, error: msg});
	};

	// 1. Delete any existing matches for this week if they exist
	function clear_old_state() {
		// Clear any existing matches
		db.client.del(week_key, function(err,reply) {
			if (err) return _error(err);
			return create_this_weeks_matches();
		});
	};

	// 2. Delete to helper to create all matches 
	function create_this_weeks_matches() {

		var counter = matches.length;
		matches.forEach(function(match) {
			db.client.incr("match_counter", function(err,reply) {
				if (err) return _error(err);

				create_single_match(parseInt(reply), match[0], match[1], function(err) {
					if (err) return _error(err);

					if (--counter == 0) {
						return append_match_ids_to_set()
					}
				});
			});
		});
	};

	// 3. Append all match ids to week list
	function append_match_ids_to_set() {
		db.client.sadd(week_key, new_match_ids, function(err,reply) {
			if (err) return _error(err);

			return res.json({success: true});
		});	
	};

	// Gets the ID needed
	function create_single_match(match_id, team_1, team_2, callback) {

		// Append ID to list
		new_match_ids.push(parseInt(match_id))

		// Create match obj
		var match = {
			id: 			match_id,
			team1Id: 		team_1[0],
			team2Id: 		team_2[0],
			team1Points: 	team_1[1],
			team2Points: 	team_2[1],
			status: 		"pending",
			winnerId: 		null,
			week: 			CONSTANTS.WEEK_OF_SEASON
		};

		db.client.hmset("match:" + match_id, match, function(err,reply) {
			if (err) return _error();
			else console.log("Match Created: ",reply);

			callback();
		});
	};
};


exports.set_match_bets = function(req,res) {

	// Each bet takes the form of [match_id, team_id, points]
	var bets = JSON.parse(req.body.matches),
		new_bet_ids = [],
		week_key = "week_" + CONSTANTS.WEEK_OF_SEASON + "_team_bets";
	
	if (!req.user)
		return res.json({success: false, error: "You must be signed in to place side-bets."});

	// Go
	create_this_weeks_bets();

	function _error(msg) {
		return res.json({success: false, error: msg});
	};

	// 1. Delegate to helper to create bets
	function create_this_weeks_bets() {

		var counter = bets.length;
		bets.forEach(function(bet) {
			db.client.incr("bet_counter", function(err,reply) {
				if (err) return _error(err);

				create_single_bet(parseInt(reply), bet, req.user.id, function(err) {
					if (err) return _error(err);

					if (--counter == 0) {
						return append_bet_ids_to_set()
					}
				});
			});
		});
	};

	// 3. Append all match ids to week list
	function append_bet_ids_to_set() {
		db.client.sadd(week_key, new_bet_ids, function(err,reply) {
			if (err) return _error(err);

			return res.json({success: true});
		});	
	};

	// Gets the ID needed
	function create_single_bet(bet_id, bet_data, user_id, callback) {

		// Append ID to list
		new_bet_ids.push(parseInt(bet_id))

		// Create match obj
		var bet = {
			id: 			bet_id,
			userId: 		user_id,
			matchId: 		bet_data[0],
			teamId: 		bet_data[1],
			points: 		bet_data[2],
			week: 			CONSTANTS.WEEK_OF_SEASON,
			status: 		'pending'
		};

		db.client.hmset("bet:" + bet_id, bet, function(err,reply) {
			if (err) return _error();
			else console.log("Bet Created: ",bet);

			callback();
		});
	};
};


/* --------------------------- */
/* ---   PRIVATE HELPERS   --- */
/* --------------------------- */

/* Inner Helper - create and join a league that is already stubbed */
function createAndJoinLeague(user, lid, callback) {

	db.League.find({where:{id: lid}}).success(function(league) {
		// TODO - error handling here...
		if (!league) callback("Missing league");

		league.updateAttributes({UserId: user.id}).success(function() {
			league.addPlayer(user).success(function() {

				user.addLeague(league).success(function() {
					callback();
				});
			});
		});
	});
};

/* Inner Helper - join league */
function joinLeague(user, lid, callback) {
	db.League.find({where:{id: lid}}).success(function(league) {
		if (!league) callback("Missing league");

		league.addPlayer(user).success(function() {

			user.addLeague(league).success(function() {
				callback();
			});
		});
	});	
};


/* Inner Helper - */
function createPicks(picks, user, week, lid, callback) {

	// TODO - ensure picks not already made this week -- if so, overwrite?

	db.Team.findAll({where: {status: 'active'}, attributes: ['short_name', 'id'] }).success(function(teams) {
		db.Pick.create({
			picks: 		helpers.formatPicksForDB(teams, picks),
			status: 	'active',
			week: 		week,
			UserId: 	user.id,
			// LeagueId: 	lid
		}).success(function(pick_set) {
			callback(null, pick_set);
		}).error(function(err) { 
			callback(err);
		});
	});
}




