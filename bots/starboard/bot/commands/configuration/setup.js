const { Command } = require('../../../../../');

class SetupCommand extends Command {
	constructor() {
		super({
			description: 'Sets up the starboard channel for your server.',
			usage: '[nsfw]',
			clientPerms: 'MANAGE_CHANNELS',
			memberPerms: 'MANAGE_CHANNELS',
		});
	}

	async run(msg, args) {
		const nsfw = args.some(arg => arg.toLowerCase() === 'nsfw');
		const board = this.client.findStarboard(msg.guild, nsfw);
		const name = `starboard${nsfw ? '-nsfw' : ''}`;
		if (board) return msg.channel.send(`The starboard is already ${board}.`);
		const channel = await msg.guild.channels.create(name, {
			nsfw,
			parent: msg.channel.parent,
			overwrites: [
				{
					id: msg.guild.id,
					deny: ['SEND_MESSAGES', 'ADD_REACTIONS'],
				},
			],
			reason: 'Setup command executed.',
		});
		await this.client.settings.set(msg.guild.id, name, channel.id);

		return msg.channel.send(`Starboard channel created in ${channel}.`);
	}
}

module.exports = SetupCommand;