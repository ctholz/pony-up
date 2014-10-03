// /*
// 	Mailer.js
// */


// var mandrill = require('node-mandrill')(CONSTANTS.MANDRILL_API_KEY);



// exports.sendBasic = function(text, subject, callback) {

// 	var opts = {
// 	    "key": CONSTANTS.MANDRILL_API_KEY,
// 	    "message": {
// 	        "html": "<p>" + txt + "</p>",
// 	        "text": txt,
// 	        "subject": "Pony Up Bot - " + subj,
// 	        "from_email": "ctholz@gmail.com",
// 	        "from_name": "Pony Up Bot",
// 	        "to": [
// 	            {
// 	                "email": "ctholz@gmail.com",
// 	                "name": "Clayton"
// 	            }, {
// 	            	"email": "sam.shapiro24@gmail.com",
// 	            	"name": "Sam"
// 	            }
// 	        ],
// 	        "headers": {
// 	            "Reply-To": "ctholz@gmail.com"
// 	        },
// 	        "important": false,
// 	        "track_opens": false,
// 	        "track_clicks": false,
// 	        "auto_text": null,
// 	        "auto_html": null,
// 	        "inline_css": null,
// 	        "url_strip_qs": null,
// 	        "preserve_recipients": null,
// 	        "view_content_link": null,
// 	        "merge": true,
// 	    },
// 	    "async": false,
// 	};

// 	var mail_cb = function(err,reply) {
// 		if (err) console.error("___ERROR___ Sending vanilla email - ", text, err);
// 		else console.log("___MAILER___ Sent vanilla email - ", reply);
// 	};

// 	// Send (or defer if a production only email)
// 	if (typeof prod_only != 'undefined' && prod_only && global.dev)
// 		console.log('___DEV___: Mailer not sending new user email');
// 	else
// 		mandrill('/messages/send', opts, mail_cb);

// };