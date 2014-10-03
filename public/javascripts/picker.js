/* Picker JS */


var $scope = {
	divisions_to_pick: $(".division-container").length,
	step: 1,
	in_wildcard_selection: false,
	selections: [],
	$division: $(".division-container:first")
}

$(function() {

	$(".team-pick-with-logo-container").on("click",togglePick);
	$("button[name='next']").on("click", submitDivisionPicks);

});


function togglePick(e) {
	var $sub_division = $(this).parent().parent(),
		$pick = $(this);

	if (!$scope.in_wildcard_selection) {

		if ($pick.hasClass("picked"))
			return $pick.removeClass("picked");

		if ($sub_division.find(".picked").length > 0)
			$sub_division.find(".picked").removeClass("picked");
		
		$pick.addClass("picked");
		$("body").animate({scrollTop:$("body").scrollTop() + 150}, 200);

	} else {
		// Can't change division winners
		if ($pick.hasClass("picked") && !($pick.hasClass("picked-wildcard"))) { 
			console.log("Picked to win divison, can't toggle for wildcard race.")
			return;
		}

		// Can't select another wildcard if two selected
		if ($scope.$division.find(".picked-wildcard").length == 2 && !($pick.hasClass("picked-wildcard"))) { 
			console.log("Already picked two wildcards, un-select one to pick this team.")
			return;
		}

		// If picked alredy, undo it
		if ($pick.hasClass("picked"))
			return $pick.removeClass("picked").removeClass("picked-wildcard");

		if ($sub_division.find(".picked-wildcard").length > 0)
			$sub_division.find(".picked-wildcard").removeClass("picked-wildcard").removeClass("picked");
		
		$pick.addClass("picked").addClass("picked-wildcard");

		if ($scope.$division.find(".picked-wildcard").length == 2)
			$("body").animate({scrollTop: $("button[name='next']").offset().top}, 200);
	}
};


function submitDivisionPicks(e) {

	var $btn = $(this);

	// First verify that proper # of selections made
	var error_message = null;
	if ($scope.step % 2 > 0) {
		if ($scope.$division.find(".picked").length < 4)
			error_message = "You must select one winner for each division.";
	} else {
		if ($scope.$division.find(".picked-wildcard").length < 2)
			error_message =  "You must pick two wildcard selections (order does not matter).";
	}

	if (error_message) {
		$btn.fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
		$scope.$division.find(".guidance-text").addClass("error").text(error_message);
		return $("body").animate({scrollTop: $(".picker-container").offset().top }, 125);
	}	


	if ($scope.step++ % 2 > 0) {
		$scope.in_wildcard_selection = true;
		selectWildcards(e);

	} else if ($scope.step == 5) {
		savePicksAndRedirectToLobby();

 	} else {


		$scope.in_wildcard_selection = false;

		var $next = $(".division-container.hidden:first");

		$scope.$division.find(".guidance-text").animate({opacity:0},250, function() {
			$(this)
				.text("Step " + $scope.step + " of 4: Pick one winner of each division")
				.animate({opacity:1}, 250, function() {
					$(this).fadeOut(250).fadeIn(250);
				});
		});
		// Hide current
		$(".division-container").not(".hidden").addClass("hidden")
		$next.removeClass("hidden");
		// Scroll to top
		$("body").animate({scrollTop: $(".picker-container").offset().top}, 125);
		// Set scope
		$scope.$division = $next
	}

	// Update button text
	if ($scope.step <= 4)
		$btn.text("Next (" + $scope.step + "/4)");
	else
		$btn.text("Done")
};

function setConferenceSelections() {
	var conference_champions = [],
		wilcard_selections = [];
	$(".picked").not(".picked-wildcard").each(function() {
		conference_champions.push($(this).data("division") + "-" + $(this).data("sub_division") + "-" + $(this).attr("name"));
	});

	var wc_ctr = 1;
	$(".picked-wildcard").each(function() {
		wilcard_selections.push($(this).data("division") + "-" + "WC" + (wc_ctr++) + "-" + $(this).attr("name"));
		if (wc_ctr > 2) wc_ctr = 1;
	});

	console.log("Champs:: ",conference_champions, " | Wilcards:: ",wilcard_selections);
	$scope.selections = $scope.selections.concat(conference_champions).concat(wilcard_selections);
};


function selectWildcards(e) {
	console.log('W::')
	var $txt = $scope.$division.find(".guidance-text")

	// scroll to top
	$("body").animate({scrollTop: $(".picker-container").offset().top}, 250);
	// change guidance text
	$txt.animate({opacity:0},250, function() {
		$(this)
			.text("Step " + $scope.step + " of 4: Pick two wildcard winners (order doesn't matter)")
			.animate({opacity:1}, 250, function() {
				$(this).fadeOut(250).fadeIn(250);
			});
	});
};


function savePicksAndRedirectToLobby() {
	setConferenceSelections();

	// If you're signed in and have an account, then just post this to DB
	if (user) {

		// TODO - need league ID for this case

		$.post("/api/set_picks", { selections: $scope.selections, week: WEEK_OF_SEASON, lid: lid }, function(res) {
			if (res.success) {
				console.log("Success:: ",res);
				window.location = "/dashboard/" + lid; 
			} else {
				console.log("Failure:: ",res);
				$("#error-container").text("Sorry, there was an error saving your picks. Please try again.")
			}
		}, "json");

	// Otherwise part of intro flow - save to localStorage
	} else {

		localStorage.setItem("selections", JSON.stringify($scope.selections));
		localStorage.setItem("first_time_visitor", true);
		window.location = "/lobby?first=true";
	}
};


