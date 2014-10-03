

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Odd', {
  	odds: 		{ type: DataTypes.ARRAY(DataTypes.INTEGER),  validate: { notEmpty: true, notNull: true }},
	status: 	{ type: DataTypes.STRING, defaultValue: 'active' },
	week: 		{ type: DataTypes.INTEGER, validate: { notEmpty: true, notNull: true }}
	});
}