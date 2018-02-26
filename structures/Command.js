const { MessageEmbed } = require('discord.js');
const Util = require('./Util');

class Command {
	constructor(options = {}) {
		this.client = null;
		this.options = {
			name: null,
			info: '',
			usage: '',
			aliases: [],
			disabled: false,
			guildOnly: false,
			ownerOnly: false,
			clientPerms: null,
			memberPerms: null,
			...options,
		};

		for (const key of Object.getOwnPropertyNames(Util))
			Object.defineProperty(this, key, {
				value: Util[key],
				writable: false,
			});
	}

	run() {
		throw new Error(`${this.constructor.name} doesn't have a run function.`);
	}

	get icon() {
		return this.client.icon || this.client.user.displayAvatarURL();
	}

	get color() {
		return this.client.color || 0x12D956;
	}

	get embed() {
		return new MessageEmbed().setColor(this.color);
	}
}

module.exports = Command;