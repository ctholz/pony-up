


/* ----------------------- */
/* --      Helpers      -- */
/* ----------------------- */


var DB_PICK_ORDERING = [
	"AFC-NORTH",
	"AFC-SOUTH",
	"AFC-EAST",
	"AFC-WEST",
	"AFC-WC1",
	"AFC-WC2",
	"NFC-NORTH",
	"NFC-SOUTH",
	"NFC-EAST",
	"NFC-WEST",
	"NFC-WC1",
	"NFC-WC2",
];

var DB_ODDS_ORDERING = [
	"PLAYOFFODDS",
	"PLAYOFFODDS",
	"DIVISIONCHAMPIONODDS",
	"DIVISIONCHAMPIONODDS",
	"WILDCARD_WINNER",
	"DIVISION_WINNER"
];

// DEV DEV DEV
var picks = ["AFC-North-Bengals", "AFC-South-Colts", "AFC-East-Dolphins", "AFC-West-Chiefs", "NFC-North-Packers", "NFC-South-Saints", "NFC-East-Eagles", "NFC-West-49ers", "AFC-WC1-Browns", "AFC-WC2-Jaguars", "NFC-WC1-Vikings", "NFC-WC2-Buccaneers"]

// Converts array of CONF-DIV-SHORT_NAME into ordered array of id's for DB
exports.formatPicksForDB = function(teams,picks) {
	
	function idForTeamName(name) {
		return (_.find(teams, function(team) { return team.short_name.toUpperCase() == name.toUpperCase() })).id;
	};

	var arr = []
	picks.forEach(function(pick) {
		var key = pick.slice(0, pick.lastIndexOf('-')).toUpperCase(),
			index = DB_PICK_ORDERING.indexOf(key);
		//console.log(key,':: ',index)
		arr[index] = idForTeamName(pick.slice(pick.lastIndexOf('-') + 1));
	});
	return arr;
};

// Converts odds object from view into integer array
exports.formatOddsForDB = function(odds) {

	// Return an array, even if singleton
	function formatValue(key, val) {
		// Winner format is binary, 0 or 1
		if (key.indexOf("winner") != -1)
			return ((val) ? [1] : [0]);
		// Otherwise, numerator / denominator, split and parse to int
		else
			return [parseInt(val.split('/')[0]), parseInt(val.split('/')[1])];
	};
	var arr = [];
	for (var key in odds) {
		var index = DB_ODDS_ORDERING.indexOf(key.toUpperCase()),
			val = formatValue(key, odds[key]);

		// Iterate through return array and enter in order
		for (var i = 0; i < val.length; i++)
			arr[index + i] = val[i];
	};
	//console.log("Odds:: ",odds, " | Value:: ",arr);
	return arr;
};

exports.getPickOrdering = function() {
	return DB_PICK_ORDERING;
};

// Input: teams, picks
	// Output: dict with array of division winners and array of wildcard winners
exports.formatPreviousPicks = function(teams, picks) {
	var previous_picks = { division_winners: [], wildcard_winners: [] },
		formatted_picks = exports.teamShortNameForIds(teams, picks);

	for (var i = 0; i < picks.length; i++) {
		if (DB_PICK_ORDERING[i].indexOf("WC") == -1)
			previous_picks.division_winners.push(formatted_picks[i]);
		else
			previous_picks.wildcard_winners.push(formatted_picks[i]);
	};

	return previous_picks;
};

exports.formatPicksForView = function(teams, picks) {
	function teamNameForId(id) {
		return (_.find(teams, function(team) { return team.id == parseInt(id) })).short_name;
	};

	return picks.map(function(set_of_picks) {

		var formatted_set_of_picks = set_of_picks;
		formatted_set_of_picks.formatted_picks = set_of_picks.picks.map(function(team_id) {
			var short_name = teamNameForId(team_id);
			return {
				id: 			team_id,
				name: 			short_name,
				logo_path: 		logoPathForTeamName(short_name)
			}
		});
		return formatted_set_of_picks;
	});
};

// Input: array of teams, array of teamIds
	// Output: array of team short names
exports.teamShortNameForIds = function(teams, team_ids) {
	function teamNameForId(id) {
		return (_.find(teams, function(team) { return team.id == parseInt(id) })).short_name;
	};
	return team_ids.map(function(team_id) {
		return teamNameForId(team_id);
	});
};


// exports.formatOddsForView = function(teams,odds) {
// 	return 'foo'
// };

// Public API (Wrapper)
exports.getLogoPathForTeamName = function(short_name) {
	return logoPathForTeamName(short_name);
};

/* Input: short name
	Output: logo path, formatted according to dev/prod env */
function logoPathForTeamName(short_name) {
	return "/images/" + ((global.dev) ? short_name.toLowerCase() : short_name) + ".png"
};



	// // Return an array, even if singleton
	// function formatValue(key, val) {
	// 	// Winner format is binary, 0 or 1
	// 	if (key.indexOf("winner") != -1)
	// 		return ((val) ? [1] : [0]);
	// 	// Otherwise, numerator / denominator, split and parse to int
	// 	else
	// 		return [parseInt(val.split('/')[0]), parseInt(val.split('/')[1])];
	// };
	// var arr = [];
	// for (var key in odds) {
	// 	var index = DB_ODDS_ORDERING.indexOf(key.toUpperCase()),
	// 		val = formatValue(key, odds[key]);

	// 	// Iterate through return array and enter in order
	// 	for (var i = 0; i < val.length; i++)
	// 		arr[index + i] = val[i];
	// };
	// //console.log("Odds:: ",odds, " | Value:: ",arr);
	// return arr;

exports.appendOddsToTeams = function(teams, odds) {
	// Map odds by id
	var odds_dict = {};
	odds.forEach(function(odd) { odds_dict[odd.TeamId] = odd });

	// TODO - case in which odds are empty
	// 
	teams.forEach(function(team) {

		if (team.id in odds_dict) {
			var team_odds = odds_dict[team.id];
			team.division_odds_display = String(team_odds.odds[2]) + "/" + String(team_odds.odds[3]);
			team.division_odds = team_odds.odds[2] / team_odds.odds[3];
			team.wc_odds_display = String(team_odds.odds[0]) + "/" + String(team_odds.odds[1]);
			team.wc_odds = team_odds.odds[0] / team_odds.odds[1];
			team.wc_winner = Boolean(team_odds.odds[4]);
			team.division_winner = Boolean(team_odds.odds[5]);

		} else {
			team.division_odds_display = team.division_odds = team.wc_odds_display = team.wc_odds = team.wc_winner = team.division_winner = null;
		}

		// used to toggle display when no odds avail
		team.odds_available = (team.id in odds_dict);

		if (team.wc_winner)
			console.log("WC: ",team.wc_winner, "team:: ",team)
	});

	return teams;
};


// BOOLEAN - 
exports.inPickingWindow = function(now) {
	// Allows manual entry of date (for testing)
	if (typeof now === 'undefined') 
		var now = new Date();
	// Monday Midnight PST <--> Thursday 4pm PST
	if (now.getUTCDay() > 2 || (now.getUTCDay() == 2 && now.getUTCHours() >= 7))
		return (now.getUTCDay() < 4 || (now.getUTCDay() < 5 && now.getUTCHours() < 19))
	else return false;
};

// INTEGER - returns total # points would win if season ended today
	// Input - array of picks, nested array of odds
exports.getProjectedPoints = function(picks, odds, teams) {

	// PICKS = [1,10,4,5,...] = teamId's
	var total_points = 0;

	// Get map of teamIds to conference keys 
	var conferenceKeysForTeams = mapTeamsToConferenceKeys(teams);

	picks.forEach(function(pick_set) {

		// If no odds for this week, default to last week
		var odds_set = (odds[pick_set.week]) ? odds[pick_set.week] : odds[pick_set.week - 1]
		// Augment odds with conference keys
		var odds_with_conference_keys = appendConferenceKeyToOdds(odds_set, conferenceKeysForTeams);
		// Get sorted division winners with points
		var division_winners = getWinnersByDivision(odds_with_conference_keys);
		// Tally winners against your picks
		total_points += pick_set.picks.reduce(function(prev, curr, index) {
			// Check your pick (=TeamId) against TeamId stored in tuple, if ==, give points
			return prev + ((division_winners[index][0] == curr) ? division_winners[index][1] : 0);
		}, 0);
	});

	return total_points;
};

/* INPUT - array of odds obj
	OUTPUT - array of tuples in PICK ORDERING = [teamId, points]  */
function getWinnersByDivision(week_of_odds) {

	var winners_list = [];
		division_winner_index = DB_ODDS_ORDERING.indexOf('DIVISION_WINNER'),
		wildcard_winner_index = DB_ODDS_ORDERING.indexOf('WILDCARD_WINNER');

	// Init winners list nested tuples to defaults [-1,0]
	for (var i = 0; i < DB_PICK_ORDERING.length; i++) 
		winners_list.push([-1,0]);

	/* Input: odds_obj | Output: Boolean */
	var is_division_winner = function(odd_set) {
		return (parseInt(odd_set.odds[division_winner_index]));
	},
	/* Input: odds_obj | Output: Boolean */
		is_wildcard_winner = function(odd_set) {
		return (parseInt(odd_set.odds[wildcard_winner_index]));
	},
	/* Input: conference key | Output: Index of position in PICK_ORDERING */
		get_conference_winner_index = function(conference_key) {
		return DB_PICK_ORDERING.indexOf(conference_key)
	},
	/* Input: conference key | Output: Index of position in PICK_ORDERING */
		get_wildcard_winner_index = function(conference_key) {
		var division = conference_key.split('-')[0],
			index = DB_PICK_ORDERING.indexOf(division + '-WC1');

		// Check if first WC slot already filled, if so return second
		return (winners_list[index] == -1) ? index : index + 1;
	},
	/* Input: odds obj | Output: points for winning division */
		get_points_for_win = function(odd_set) {
		return parseInt(odd_set.odds[DB_ODDS_ORDERING.indexOf('DIVISIONCHAMPIONODDS')]) / parseInt(odd_set.odds[DB_ODDS_ORDERING.lastIndexOf('DIVISIONCHAMPIONODDS')])
	},
	/* Input: odds obj | Output: points for winning wildcard */
		get_points_for_wildcard = function(odd_set) {
		return parseInt(odd_set.odds[DB_ODDS_ORDERING.indexOf('PLAYOFFODDS')]) / parseInt(odd_set.odds[DB_ODDS_ORDERING.lastIndexOf('PLAYOFFODDS')]);
	};


	week_of_odds.forEach(function(odd_set) {
		//console.log(is_division_winner(odd_set), is_wildcard_winner(odd_set), odd_set)

		if (is_division_winner(odd_set))
			winners_list[get_conference_winner_index(odd_set.conference_key)] = [odd_set.TeamId, get_points_for_win(odd_set)];

		else if (is_wildcard_winner(odd_set))
			winners_list[get_wildcard_winner_index(odd_set.conference_key)] = [odd_set.TeamId, get_points_for_wildcard(odd_set)];
	});

	return winners_list;
};



/* Input = array of odds for a given week,
	Output = array according to pick ordering with teamId winners and payouts */
function formatOddsByWinnerWithPoints(odds) {

};

/* INPUT - array of odds obj, map of teamIds <--> conference keys
	OUTPUT - array of odds obj augmented with conference key */
function appendConferenceKeyToOdds(week_of_odds, conference_to_team_map) {
	return week_of_odds.map(function(odd_set) {
		odd_set.conference_key = conference_to_team_map[odd_set.TeamId];
		return odd_set;
	});
};

/* Input = array of team objects
	Output = dict mapping teamIds to conference keys (for pick ordering) */
function mapTeamsToConferenceKeys(teams) {
	var d = {};
	teams.forEach(function(team) {
		d[team.id] = team.division.toUpperCase() + "-" + team.sub_division.toUpperCase()
	});
	return d;
};


/* DUMB encryption */
exports.encrypt = function(num) {
	return btoa(num);
};

exports.decrypt = function(num) {
	return atob(num);
};





