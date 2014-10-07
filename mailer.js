/*
	Mailer.js
*/

var MANDRILL_API_KEY = "ot_cp4jYJNhpl8R6NTBY3g",
	mandrill = require('node-mandrill')(MANDRILL_API_KEY);



exports.sendBasic = function(text, subject, callback) {

	var opts = {
	    "key": MANDRILL_API_KEY,
	    "message": {
	        "html": "<p>" + txt + "</p>",
	        "text": txt,
	        "subject": "Pony Up Bot - " + subj,
	        "from_email": "ctholz@gmail.com",
	        "from_name": "Pony Up Bot",
	        "to": [
	            {
	                "email": "ctholz@gmail.com",
	                "name": "Clayton"
	            }, {
	            	"email": "sam.shapiro24@gmail.com",
	            	"name": "Sam"
	            }
	        ],
	        "headers": {
	            "Reply-To": "ctholz@gmail.com"
	        },
	        "important": false,
	        "track_opens": false,
	        "track_clicks": false,
	        "auto_text": null,
	        "auto_html": null,
	        "inline_css": null,
	        "url_strip_qs": null,
	        "preserve_recipients": null,
	        "view_content_link": null,
	        "merge": true,
	    },
	    "async": false,
	};

	var mail_cb = function(err,reply) {
		if (err) console.error("___ERROR___ Sending vanilla email - ", text, err);
		else console.log("___MAILER___ Sent vanilla email - ", reply);
	};

	// Send (or defer if a production only email)
	// if (typeof prod_only != 'undefined' && prod_only && global.dev)
	// 	console.log('___DEV___: Mailer not sending new user email');
	// else
	mandrill('/messages/send', opts, mail_cb);

};


exports.sendWelcomeEmail = function(recipient, callback) {

	var key = "welcome-email"

	// Init template
	var template = {

		"key": MANDRILL_API_KEY,
		"template_name": key,
		"template_content": [], 
		"message": {
			"to": [{'email':recipient.email, 'name':recipient.fullName()}],
			"headers": {
				"Reply-To": "sam.shapiro24@gmail.com"
			},
			"track_opens": true,
			"track_clicks": true,
			"auto_text": null,
			"auto_html": null,
			"inline_css": null,
			"view_content_link": null,
			"tracking_domain": null,
			"signing_domain": null,
			"return_path_domain": null,
			"url_strip_qs": null,
			"view_content_link": null,
			"ip_pool": "Main Pool",
		}
	};

	// * Set Template Editable regions * //
	template.template_content.push(
	{
		"name":  		"first_name",
		"content":		recipient.first_name
	});

	sendFromTemplateInternal(template, key, function(err, reply) {
		if (err)
			console.error('___ERROR___: Mailer - sending - ',key,' to ',recipient.email, ' - ',err);
		else
			console.log('___MAILER___: sent - ',key, ' to ',recipient.email, ' - ',reply);

		if (typeof callback !== 'undefined') return callback();
		else return;
	});
};

// Input: user, callback
	// Output: sends user an email 
exports.sendWindowOpenEmail = function(recipient, callback) {

	var key = "picking-window-opening-reminder"

	// Init template
	var template = {

		"key": MANDRILL_API_KEY,
		"template_name": key,
		"template_content": [], 
		"message": {
			"to": [{'email':recipient.email, 'name':recipient.fullName()}],
			"headers": {
				"Reply-To": "sam.shapiro24@gmail.com"
			},
			"track_opens": true,
			"track_clicks": true,
			"auto_text": null,
			"auto_html": null,
			"inline_css": null,
			"view_content_link": null,
			"tracking_domain": null,
			"signing_domain": null,
			"return_path_domain": null,
			"url_strip_qs": null,
			"view_content_link": null,
			"ip_pool": "Main Pool",
		}
	};

	// * Set Template Editable regions * //
	template.template_content.push(
	{
		"name":  		"first_name",
		"content":		recipient.first_name
	});

	sendFromTemplateInternal(template, key, function(err, reply) {
		if (err)
			console.error('___ERROR___: Mailer - sending - ',key,' to ',recipient.email, ' - ',err);
		else
			console.log('___MAILER___: sent - ',key, ' to ',recipient.email, ' - ',reply);

		if (typeof callback !== 'undefined') return callback();
		else return;
	});
};

exports.sendWindowCloseEmail = function(recipient, callback) {

	var key = "picking-window-closing-reminder"

	// Init template
	var template = {

		"key": MANDRILL_API_KEY,
		"template_name": key,
		"template_content": [], 
		"message": {
			"to": [{'email':recipient.email, 'name':recipient.fullName()}],
			"headers": {
				"Reply-To": "sam.shapiro24@gmail.com"
			},
			"track_opens": true,
			"track_clicks": true,
			"auto_text": null,
			"auto_html": null,
			"inline_css": null,
			"view_content_link": null,
			"tracking_domain": null,
			"signing_domain": null,
			"return_path_domain": null,
			"url_strip_qs": null,
			"view_content_link": null,
			"ip_pool": "Main Pool",
		}
	};

	// * Set Template Editable regions * //
	template.template_content.push(
	{
		"name":  		"first_name",
		"content":		recipient.first_name
	});

	sendFromTemplateInternal(template, key, function(err, reply) {
		if (err)
			console.error('___ERROR___: Mailer - sending - ',key,' to ',recipient.email, ' - ',err);
		else
			console.log('___MAILER___: sent - ',key, ' to ',recipient.email, ' - ',reply);

		if (typeof callback !== 'undefined') return callback();
		else return;
	});
};

// Internal helper that calls mail API method
function sendFromTemplateInternal(template, key, callback) {
	// Hit Mandrill API
	mandrill('/messages/send-template', template, function(err,reply) {
		callback(err, reply);
	});
};


exports.sendMorningCoffee = function(recipient, top_performers, bottom_performers, match_stats, them_stats, callback, next_week) {

	// TEMPLATE VARS --> top-performers, worst-performers, you-match-gain, opponent-match-gain


	// Init template
	var daily_coffee_template = {

		"key": MANDRILL_API_KEY,
		"template_name":"auto-daily-reminder-email",
		"template_content": [], 
		"message": {
			"to": [{'email':recipient.email, 'name':recipient.name}],
			"headers": {
				"Reply-To": "mike@bearandbull.co"
			},
			"track_opens": true,
			"track_clicks": true,
			"auto_text": null,
			"auto_html": null,
			"inline_css": null,
			"view_content_link": null,
			"tracking_domain": null,
			"signing_domain": null,
			"return_path_domain": null,
			"url_strip_qs": null,
			"view_content_link": null,
			"ip_pool": "Main Pool",
		}
	};

	// * Set Template Editable regions * //
	daily_coffee_template.template_content.push(
	{
		"name":  		"first-name",
		"content":		match_stats.first_name
	}, {
		"name":  		"top-performers",
		"content":		top_performers
	}, {
		"name": 		"bottom-performers",
		"content": 		bottom_performers
	}, {
		"name": 		"match-text",
		"content": 		match_stats.match_summary
	}, {
		"name": 		"you-day-change",
		"content": 		match_stats.day_text
	}, {
		"name": 		"them-day-change",
		"content": 		them_stats.day_text	
	}, {
		"name": 		"you-match-change",
		"content": 		match_stats.match_text
	}, {
		"name": 		"them-match-change",
		"content": 		them_stats.match_text
	});

	//	console.log("Pre: ", daily_coffee_template.template_content)

	// Hit Mandrill API
	mandrill('/messages/send-template', daily_coffee_template, function(error,reply) {
		if (error) console.error('___ERROR___: Mailer - sending morning coffee - ',recipient.email, ' - ',err);
		else console.log('___MAILER___: Morning coffee sent - ',recipient.email, ' - ',reply);

		// Call original callback
		callback();
	});
}