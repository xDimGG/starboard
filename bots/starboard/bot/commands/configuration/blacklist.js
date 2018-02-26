const { Command } = require('../../../../../');

class BlacklistCommand extends Command {
	constructor() {
		super({
			aliases: ['bl', 'black'],
			description: 'Prevents a user or channel from appearing in the starboard channel.',
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
		if (exists) return msg.channel.send(`${phrase} is already blacklisted.`);
		await this.client.blacklists.add(prop.id, channel ? 'channel' : 'user', msg.guild.id);

		return msg.channel.send(`${phrase} is now blacklisted.`);
	}
}

module.exports = BlacklistCommand;