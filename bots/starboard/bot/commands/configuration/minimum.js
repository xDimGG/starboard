const { Command } = require('../../../../../');

class MinimumCommand extends Command {
	constructor() {
		super({
			aliases: ['threshold'],
			description: 'Sets a starboard threshold.',
			usage: '[1-100]',
			memberPerms: 'MANAGE_MESSAGES',
		});
	}

	async run(msg, args) {
		const minimum = this.client.settings.get(msg.guild.id, 'minimum', 1);
		const number = parseInt(args[0]);
		if (!Number.isInteger(number)) return msg.channel.send(`The starboard threshold is currently ${minimum}.`);
		if (number < 1 || number > 100) return false;
		if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.owner) return msg.channel.send('Only people with `Administrator` can set the threshold.');
		await this.client.settings.set(msg.guild.id, 'minimum', number);

		return msg.channel.send(`The starboard threshold is now ${number}.`);
	}
}

module.exports = MinimumCommand;