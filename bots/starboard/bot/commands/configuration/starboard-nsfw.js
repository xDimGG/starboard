const { Command } = require('../../../../../');

class StarboardNSFWCommand extends Command {
	constructor() {
		super({
			aliases: ['nsfw-board', 'nsfw-starboard', 'board-nsfw'],
			description: 'Set the starboard of your server (`none` for no starboard).',
			usage: '[#channel|none]',
			memberPerms: 'MANAGE_CHANNELS',
		});
	}

	async run(msg, args) {
		const channel = this.client.findStarboard(msg.guild, true);
		const arg = args.join(' ').toLowerCase() === 'none' ? 'none' : msg.mentions.channels.first();
		if (!arg) return msg.channel.send(channel ? `The NSFW starboard is currently ${channel}.` : 'This server doesn\'t have an NSFW starboard!');
		if (!msg.member.hasPermission('ADMINISTRATOR')) return msg.channel.send('Only people with `Administrator` can set the NSFW starboard.');
		if (arg !== 'none' && arg.type !== 'text') return false;
		if (arg !== 'none' && !arg.nsfw) return msg.channel.send('That channel isn\'t NSFW!');
		await this.client.settings.set(msg.guild.id, 'starboard-nsfw', arg.id);

		return msg.channel.send(arg === 'none' ? 'I no longer have an NSFW starboard!' : `The NSFW starboard is now ${arg}.`);
	}
}

module.exports = StarboardNSFWCommand;