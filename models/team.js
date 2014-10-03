

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Team', {
  	long_name: 		{ type: DataTypes.STRING, validate : { notEmpty: true, notNull: true }},
  	short_name: 	{ type: DataTypes.STRING, validate : { notEmpty: true, notNull: true }},
  	division: 		{ type: DataTypes.ENUM('NFC','AFC'), validate: { notEmpty: true, notNull: true }},
  	sub_division:   { type: DataTypes.ENUM('North', 'South', 'East', 'West'), validate: { notEmpty: true, notNull: true }},
	logo: 			{ type: DataTypes.STRING },
	status: 		{ type: DataTypes.STRING, defaultValue: 'active' },
	});
}