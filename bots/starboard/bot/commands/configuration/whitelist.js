const { Command } = require('../../../../../');

class WhitelistCommand extends Command {
	constructor() {
		super({
			aliases: ['wl', 'white'],
			description: 'Reverts blacklists.',
			usage: '<#channel|@user>',
			memberPerms: 'MANAGE_MESSAGES',
		});
	}

	async run(msg) {
		const prop = msg.mentions.members.first() || msg.mentions.channels.first();
		if (!prop || prop.type && prop.type !== 'text') return false;
		const channel = prop.type === 'text';
		const phrase = channel ? `${prop}` : `**${prop.displayName}**`;
		const exists = await this.client.blacklists.has(prop.id, msg.guild.id);
		if (!exists) return msg.channel.send(`${phrase} is already whitelisted.`);
		await this.client.blacklists.remove(prop.id, msg.guild.id);

		return msg.channel.send(`${phrase} is now whitelisted.`);
	}
}

module.exports = WhitelistCommand;