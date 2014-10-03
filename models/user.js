
module.exports = function(sequelize, DataTypes) {
 return sequelize.define('User', {
	first_name: 	{ type: DataTypes.STRING, validate: { notEmpty: true, notNull: true }},
	last_name: 		{ type: DataTypes.STRING, validate: { notEmpty: true, notNull: true }},
	alias: 			{ type: DataTypes.STRING }, 
	email: 			{ type: DataTypes.STRING, validate: { isEmail: true, notNull: true }},
	password: 		{ type: DataTypes.STRING, validate: { notEmpty: true, notNull: true }},
	status: 		{ type: DataTypes.STRING, defaultValue: 'active' },
	}, {
		instanceMethods: {
			fullName: function() {
				return [this.first_name, this.last_name].join(' ');
			},
			abbrName: function() {
				return this.first_name + ' ' + this.last_name.slice(0,1);
			},
			fullNameWithAlias: function() {
				return this.first_name + ' "' + this.alias + '" ' + this.last_name;
			}
		}
	});
}