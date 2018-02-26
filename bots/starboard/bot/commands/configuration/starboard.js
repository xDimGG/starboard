const { Command } = require('../../../../../');

class StarboardCommand extends Command {
	constructor() {
		super({
			aliases: ['board'],
			description: 'Set the starboard of your server (`none` for no starboard).',
			usage: '[#channel|none]',
			memberPerms: 'MANAGE_CHANNELS',
		});
	}

	async run(msg, args) {
		const channel = this.client.findStarboard(msg.guild);
		const arg = args.join(' ').toLowerCase() === 'none' ? 'none' : msg.mentions.channels.first();
		if (!arg) return msg.channel.send(channel ? `The starboard is currently ${channel}.` : 'This server doesn\'t have a starboard!');
		if (!msg.member.hasPermission('ADMINISTRATOR')) return msg.channel.send('Only people with `Administrator` can set the starboard.');
		if (args.length && (arg !== 'none' && arg.type !== 'text')) return false;
		await this.client.settings.set(msg.guild.id, 'starboard', arg.id);

		return msg.channel.send(arg === 'none' ? 'I no longer have a starboard!' : `The starboard is now ${arg}.`);
	}
}

module.exports = StarboardCommand;