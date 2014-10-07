
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

	createPicks(picks, req.user, week, lid, function(err, picks) {
		if (err) {
			console.error("___ERROR___: createPicks callback - ",err);
			return res.json({success: false});
		} else {
			console.log("___SUCCESS___: picks set - ",picks.values);
			return res.json({success: true });
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

		// TODO - what if already made and need to overwrite

		db.Odd.create({
			week: 			CONSTANTS.WEEK_OF_SEASON,
			odds: 			helpers.formatOddsForDB(odds_for_team),
			status: 		'active',
			TeamId: 		team.id
		}).success(function(odd) {
			console.log("Odd added for [",team.short_name,"]");

			if (--ctr == 0)
				res.json({success:true})
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
		return res.render("sign_up", { errors: [err] });
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
								return res.json({success: false});
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

	db.User.find({where:{ email: req.body.email }}).success(function(user) {
		if (user) return _error({field: "email", text: "There's already a Pony Up user registered with that email address, please use another."})

		_createUser();
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

	if (password == "") password = null

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
				league.getPlayers().success(function(players) {
					console.log("LEAGUE NOW HAS ",players.length," PLAYERS\n\n");

					req.user.addLeague(league).success(function() {
						return res.redirect("/dashboard/" + league.id);
					});
				});
			});
		} else {
			return res.json({ success: true });
		}
	});
};


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




