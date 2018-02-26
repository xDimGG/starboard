const { Command } = require('../../../');

class PrefixCommand extends Command {
	constructor() {
		super({
			aliases: ['p'],
			description: 'Set the prefix of your server (`none` for no prefix).',
			usage: '[prefix|none]',
			memberPerms: 'ADMINISTRATOR',
		});
	}

	async run(msg, args) {
		const prefix = this.client.settings.get(msg.guild.id, 'prefix') === 'none';
		const arg = args.join(' ').toLowerCase() === 'none' ? 'none' : args.join(' ');
		if (!arg) return msg.channel.send(prefix ? 'This server doesn\'t have a prefix set!' : `The prefix is currently \`\`${msg.prefix}\`\`.`);
		if (!msg.member.hasPermission('ADMINISTRATOR')) return msg.channel.send('Only people with `Administrator` can set the prefix.');
		if (arg.length > 10) return msg.channel.send('The prefix can\'t be longer than 10 characters!');
		if (arg === prefix) return msg.channel.send(`The prefix is already \`\`${arg}\`\`.`);
		await this.client.settings.set(msg.guild.id, 'prefix', arg);

		return msg.channel.send(arg === 'none' ? 'I no longer have a prefix! I can only be used through mentions.' : `The prefix is now \`\`${arg}\`\`.`);
	}
}

module.exports = PrefixCommand;