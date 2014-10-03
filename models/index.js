// Init PG
if (!global.hasOwnProperty('db')) {
  var Sequelize = require('sequelize')
    , sequelize = null
  if (process.env.HEROKU_POSTGRESQL_BROWN_URL) {
    // the application is executed on Heroku ... use the postgres database
    var match = process.env.HEROKU_POSTGRESQL_BROWN_URL.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

    sequelize = new Sequelize(match[5], match[1], match[2], {
      dialect:  'postgres',
      protocol: 'postgres',
      port:     match[4],
      host:     match[3],
      logging:  true //false
    })
  } else {

    // the application is executed on the local machine ... use mysql
    sequelize = new Sequelize('nflDb', 'postgres', 'classics', {
    	dialect: 'postgres',
    	protocol: 'posgtres',
    });
  }

  /* Set each table as property of 'db' global object */
  global.db = {
    Sequelize:  Sequelize,
    sequelize:  sequelize,
    User:       sequelize.import(__dirname + '/user'),
    Team:       sequelize.import(__dirname + '/team'),
    Pick:       sequelize.import(__dirname + '/pick'),
    League:     sequelize.import(__dirname + '/league'),
    Odd:        sequelize.import(__dirname + '/odd')
  }

  /* Associations */
  global.db.User.hasOne(global.db.Team, { as: "FavoriteTeam" });
  global.db.User.hasMany(global.db.Pick, { as: "Picks" });
  global.db.User.hasMany(global.db.League, { as: "Leagues" });

  global.db.Pick.belongsTo(global.db.User);
  //global.db.Pick.belongsTo(global.db.League);

  //global.db.League.hasOne(global.db.User, { as: "Commissioner" });
  global.db.League.belongsTo(global.db.User, { as: "Commissioner" });
  global.db.League.hasMany(global.db.User, { as: "Players" });

  global.db.Odd.belongsTo(global.db.Team);

  global.db.Team.hasMany(global.db.Odd, { as: "Odds" });

  var redis = require("redis");

  /* Initialize Redis */
  if (process.env.REDISTOGO_URL) {
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    global.db.client = redis.createClient(rtg.port, rtg.hostname);
    db.client.auth(rtg.auth.split(":")[1]);
    db.client.on("error", function (err) {
        console.log("___[ERROR]____: : : : REDIS error - ",err);
    });
  } else {
    global.db.client = redis.createClient(null, null);
    db.client.on("error", function (err) {
        console.log("___[ERROR]____: : : : REDIS error - ",err);
    });
  }
}

module.exports = global.db



