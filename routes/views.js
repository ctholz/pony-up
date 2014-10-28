

/* ------------------------ */
/* --    Views Router    -- */
/* ------------------------ */


/* View - Dashboard */
exports.dashboard = function(req, res) {

	var lid = req.params.lid,
		data = { 
			lid: 				lid,
			picks: 		   		[],
			leaderboard: 		[],
			pick_ordering: 		helpers.getPickOrdering(),
		};
		
	// Bounds checking
	if (!memberOfLeauge(res.locals.my_leagues, lid))
		return res.redirect("/lobby?error='Not a member of this league'");

	return getLeagueAndPlayers();


	// Get picks for each player in your league
	function getPicks() {
		var counter = data.players.length;
		data.players.forEach(function(player) {

			db.Pick.findAll({where: { UserId: player.id }}).success(function(picks) {
				if (picks) {
					if (player.id == req.user.id)
						data.picks = helpers.formatPicksForView(res.locals.teams, picks.map(function(pick) { return pick.values }));
					player.picks = picks.map(function(pick) { return pick.values; });

					player.projected_points = helpers.getProjectedPoints(player.picks, res.locals.odds, res.locals.teams);
					player.picks = helpers.formatPicksForView(res.locals.teams, player.picks);
				}

				if (--counter == 0) {
					// Sort players by projected points
					data.players = data.players.sort(function(a,b) {
						return b.projected_points - a.projected_points;
					});

					return res.render("dashboard", data);
				}
			});	
		});
	};

	// Get league info + players in league
	function getLeagueAndPlayers() {
		db.League.find({where:{id: lid}}).success(function(league) {
			data.league = league.values;

			league.getPlayers().success(function(players) {
				data.players = players.map(function(player) { return player.values });
				
				return getPicks();
			});
		});
	};
};

/* View - Create League */
exports.create_league = function(req,res) {
	// Just a vanilla form
	return res.render("create_league", {});
};

/* View - FAQ */
exports.faq = function(req, res) {
	return res.render("faq", {faqs: CONSTANTS.FAQS})
};

/* Psuedo-view - Log out and redirect to welcome */
exports.logout = function(req, res) {
	req.logout();
	// TODO : clear localStorage here
	return res.redirect('/welcome')
}

exports.sign_up = function(req, res) {
	var data = { };

	// TODO : edge case checking on lid param

	// Don't let you in if you're already logged in
	if ('lid' in req.query) {
		data.is_commissioner = true;

		var atob = require("atob");
		data.lid = parseInt(atob(req.query.lid));
	} else
		data.is_commissioner = false;

	db.Team.findAll({attributes:['short_name']}).success(function(teams) {
		data.teams = _.pluck(teams,'short_name');

		return res.render("sign_up", data);
	});
};

/* View - Lobby */
exports.lobby = function(req, res) {

    var data = {
        leagues: [],
        errors: [],
        picks: [],
        pick_ordering: 		helpers.getPickOrdering(),
        made_weekly_bets: false
    };

    return getLeagues();


    function checkIfWeeklyBetsMade() {
    	if (!req.user) {
    		data.made_weekly_bets = true;
    		return res.render("lobby", data);
    	}

    	var bet_key = "week_" + CONSTANTS.WEEK_OF_SEASON + "_team_bets";
    	db.client.smembers(bet_key, function(err,reply) {

    		var counter = reply.length;
    		reply.forEach(function(bet_id) {
    			db.client.hget("bet:" + bet_id, "userId", function(err,reply) {
    				if (parseInt(reply) == req.user.id)
    					data.made_weekly_bets = true;

    				if (--counter == 0)
    					return res.render("lobby", data);
    			});
    		});

    		if (counter == 0)
    			return res.render("lobby", data);
    	});
    };

    function getWeeklyMatches() {

    	console.log("\n\nFetching weekly matches...\n\n")

    	function _error() {
    		data.matches = [];
    		return res.render("lobby", data);
    	}

	    //	res.render("lobby", data);
	    db.client.smembers("week_" + CONSTANTS.WEEK_OF_SEASON + "_team_matches", function(err,reply) {
	    	data.matches = [];
	    	var match_ids = reply,
	    		counter = match_ids.length;

	    	match_ids.forEach(function(mid) {
	    		db.client.hgetall("match:" + mid, function(err,reply) {
	    			if (err) return _error();

	    			data.matches.push(reply);

	    			if (--counter == 0) {
	    				data.matches = helpers.formatMatchesForView(res.locals.teams, data.matches);
	    				console.log("D:: ",data.matches)
	    				return checkIfWeeklyBetsMade();
	    			}
	    		})
	    	});

	    	if (counter == 0)
	    		return checkIfWeeklyBetsMade();
	    });
    };


    // Gets users picks for viewing in the lobby
    function getUserPicks() {
    	if (!req.user)
    		return res.render("lobby", data);

		db.Pick.findAll({where: { UserId: req.user.id }}).success(function(picks) {
			
			data.picks = helpers.formatPicksForView(res.locals.teams, picks.map(function(pick) {
				return pick.values
			}));
			
			return getWeeklyMatches();
		});	
    };


	// Fetch active leagues for the lobby
    function getLeagues() {
	  	db.League.findAll({where:{status:'active'}}).success(function(leagues) {
	        var counter = leagues.length;

	        if (counter == 0)
	        	return getUserPicks();

	        leagues.forEach(function(league) {
	            league.getPlayers().success(function(players) {
	            	/* there will be stub leagues in here if created in reverse, ignore them */
	            	if (league.UserId)

		                data.leagues.push({
		                    id: league.id,
		                    title: league.title,
		                    password: league.password,
		                    players: players.map(function(p) { return p.abbrName() }),
		                });

	                if (--counter == 0)
	                    return getUserPicks();
	            });
	        });
	    });
    };
};

/* VIEW - picker */
exports.picker = function(req,res) {

	var data = {
		lid: 	('lid' in req.query && !isNaN(parseInt(req.query.lid))) ? parseInt(req.query.lid) : -1
	};
	
	if (req.user)
		res.locals.user = req.user

	if ('error' in req.query)
		data.error = req.query.error

	// Start
	getPreviousPicks();


	// Teams + Odds already added, just need to format by conference
	function organizeTeams() {
		data.teams = teamsByConference(res.locals.teams);
		return res.render('picker',data);
	}

	// Get previous picks for highlighting if applicable
	function getPreviousPicks() {
		if (!req.user) {
			data.previous_picks = null;
			return organizeTeams();
		}

		// Get your most recent picks for team highlighting 
		db.Pick.findAll({where: { week: [CONSTANTS.WEEK_OF_SEASON, CONSTANTS.WEEK_OF_SEASON - 1], UserId: req.user.id }}).success(function(picks) {

			var most_recent_picks = picks.sort(function(a,b) { return b.week - a.week })[0].values;
			data.previous_picks = helpers.formatPreviousPicks(res.locals.teams, most_recent_picks.picks)

			return organizeTeams();
		});
	}
};

/* View -- admin */
exports.admin = function(req, res) {

	var users = [];

	db.Team.findAll({where: {status: 'active'}}).success(function(teams) {

		db.User.findAll().success(function(users) {

			var counter = users.length;
			users.forEach(function(user) {

				user.getLeagues().success(function(leagues) {
					user = user.values;
					user.leagues = (leagues) ? leagues.map(function(league) { return league.title }).join(", ") : "";
					user.createdAt = user.createdAt.toDateString();
					users.push(user);

					if (--counter == 0)
						return res.render('admin', {
							teams: 				teams,
							pick_ordering: 		helpers.getPickOrdering(),
							users: 				users
						});
				});
			});
		});
	});
};












// * Helpers * //
// Returns teams ordered in nested dictionary
function teamsByConference(teams) {

	var dict = {};
	teams.forEach(function(team) {
		if (team.division in dict) {
			if (team.sub_division in dict[team.division])
				dict[team.division][team.sub_division].push(team);
			else
				dict[team.division][team.sub_division] = [team];
		} else {
			dict[team.division] = { }; 	// because can't assign key dynamically
			dict[team.division][team.sub_division] = [team];
		}
	});
	return dict;
}



// var odds = {
// "Ravens": 
// "Bengals"
// "Browns"
// "Steelers"
// "Texans"
// "Colts"
// "Jaguars"
// "Titans"
// "Bills"
// "Dolphins"
// "Patriots"
// "Jets"
// "Broncos"
// "Chiefs"
// "Raiders"
// "Chargers"
// "Bears"
// "Lions"
// "Packers"
// "Vikings"
// "Falcons"
// "Panthers"
// "Saints"
// "Buccaneers"
// "Cowboys"
// "Giants"
// "Eagles"
// "Redskins"
// "Cardinals"
// "Rams"
// "49ers"
// "Seahawks"
// }






// ---  Helpers  --- //
function memberOfLeauge(leagues, id) {
	return (_.pluck(leagues, 'id').indexOf(parseInt(id)) != -1)
}


