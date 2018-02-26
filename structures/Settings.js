const Sequelize = require('sequelize');

class Settings {
	constructor(sequelize) {
		this.db = sequelize.define('settings', {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			key: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			value: Sequelize.TEXT,
		});
		this.data = {};
		this.init();
	}

	async init() {
		await this.db.sync();
		const rows = await this.db.findAll({ attributes: ['id', 'key', 'value'] });
		for (const { id, key, value } of rows.map(row => row.dataValues))
			this._set(id, key, value);
	}

	_set(id, key, value) {
		if (value === 'none') this.delete(id, key);
		if (id in this.data) this.data[id][key] = value;
		else this.data[id] = { [key]: value };
	}

	get(id, key, def) {
		const prop = id in this.data ? this.data[id][key] : undefined;

		return prop === undefined ? def : prop;
	}

	set(id, key, value) {
		this._set(id, key, value);

		return this.db.upsert({ id, key, value });
	}

	delete(id, key) {
		if (id in this.data) delete this.data[id][key];

		return this.db.destroy({ where: { id, key } });
	}

	deleteAll(id) {
		if (id in this.data) delete this.data[id];

		return this.db.destroy({ where: { id } });
	}
}

module.exports = Settings;