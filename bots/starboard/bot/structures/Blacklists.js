const Sequelize = require('sequelize');

class Blacklists {
	constructor(client) {
		this.db = client.db.define('blacklists', {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			type: Sequelize.STRING,
			guild: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
		});
	}

	add(id, type, guild) {
		return this.db.create({ id, type, guild });
	}

	has(id, guild) {
		return this.db.count({ where: { id, guild } });
	}

	remove(id, guild) {
		return this.db.destroy({ where: { id, guild } });
	}
}

module.exports = Blacklists;