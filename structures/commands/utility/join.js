const { Command } = require('../../../');

class JoinCommand extends Command {
	constructor() {
		super({
			description: 'Generates an invite for a specified server.',
			usage: '<id|name>',
			ownerOnly: true,
		});
	}

	async run(msg, args) {
		const guild = this.client.guilds.get(args[0]) || this.client.guilds.find(g => g.name.toLowerCase().includes(args.join(' ').toLowerCase()));
		if (!guild) return msg.channel.send(`I couldn't find a guild with and id or name of **${args.join(' ')}**.`);
		const channel = guild.channels.find(c => c.permissionsFor(guild.me).has('CREATE_INSTANT_INVITE'));
		if (!channel) return msg.channel.send('A guild was found but I can\'t create an invite for it.');
		try {
			const invite = await channel.createInvite();

			return msg.channel.send(invite.url);
		} catch (error) {
			return msg.channel.send('Darn, I couldn\'t create an invite.');
		}
	}
}

module.exports = JoinCommand;