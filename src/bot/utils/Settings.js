const { prefix } = require('../../../config');

class Settings {
	constructor(db) {
		this.db = db;
		this._settings = {};
	}

	async start(guilds) {
		await this.db.run('CREATE TABLE IF NOT EXISTS settings (guild TINYTEXT, key TINYTEXT, value TEXT)');
		await this.db.all(`SELECT * FROM settings`).then(rows => {
			for (const row of rows) {
				if (!(row.guild in this)) this._settings[row.guild] = {};
				this._settings[row.guild][row.key] = row.value;
			}
		});
		for (const guild of guilds) {
			this.defaults(guild);
		}
	}

	defaults(guild) {
		if (!(guild in this)) this._settings[guild] = {};
		if (!('prefix' in this._settings[guild])) this.set(guild, 'prefix', prefix);
		if (!('minimum' in this._settings[guild])) this.set(guild, 'minimum', 1);
		if (!('minimal' in this._settings[guild])) this.set(guild, 'minimal', 1);
	}

	get(guild, key) {
		return this._settings[guild][key];
	}

	set(guild, key, value) {
		this.db.get(`SELECT * FROM settings WHERE guild = (?) AND key = (?)`, guild, key).then(val => {
			if (val) {
				this.db.run(`UPDATE settings SET value = (?) WHERE guild = (?) AND key = (?)`, value, guild, key);
			} else {
				this.db.run(`INSERT INTO settings (guild, key, value) VALUES (?, ?, ?)`, guild, key, value);
			}
		});
		this._settings[guild][key] = value;
	}

	create(guild) {
		this.db.run(`CREATE TABLE IF NOT EXISTS G${guild} (key TINYTEXT PRIMARY KEY, value TEXT)`);
		this.db.all(`SELECT * FROM settings WHERE guild = (?)`, guild).then(val => {
			if (!val.length) this.defaults(guild);
		});
	}
}

module.exports = Settings;