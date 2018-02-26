const { Command } = require('../../../');

class EmojisCommand extends Command {
	constructor() {
		super({
			description: 'Lists my emojis.',
			usage: '[page]',
			ownerOnly: true,
		});
	}

	run(msg, args) {
		const arg = this.integer(args[0]);
		try {
			const info = this.client.emojis
				.sort((a, b) => b.createdTimestamp - a.createdTimestamp)
				.map(String);
			const { footer, data } = this.paginate(info, arg, 25);
			const embed = this.embed
				.setAuthor(`${this.client.user.username}'s Emojis`, this.icon)
				.setDescription(this.grid(data).map(emojis => emojis.join(' ')))
				.setFooter(footer);

			return msg.channel.send(embed);
		} catch (error) {
			return msg.channel.send(error);
		}
	}
}

module.exports = EmojisCommand;