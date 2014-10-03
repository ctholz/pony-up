
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('League', {
  	title: 			{ type: DataTypes.STRING, validate : { notEmpty: true, notNull: true }},
  	password: 		{ type: DataTypes.STRING },
	status: 		{ type: DataTypes.STRING, defaultValue: 'active' },
	});
}