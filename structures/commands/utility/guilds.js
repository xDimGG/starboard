const { Command } = require('../../../');

class GuildsCommand extends Command {
	constructor() {
		super({
			aliases: ['servers'],
			description: 'Lists my guilds.',
			usage: '[page]',
			ownerOnly: true,
		});
	}

	run(msg, args) {
		const arg = this.integer(args[0]);
		try {
			const info = this.client.guilds
				.map(guild => [
					guild.memberCount,
					guild.id,
					this.trim(guild.name, 25),
				])
				.sort((a, b) => b[0] - a[0]);
			const { footer, data } = this.paginate(info, arg);
			const table = this.table(data);
			const embed = this.embed
				.setAuthor(`${this.client.user.username}'s Guilds`, this.icon)
				.setDescription(this.code(table.join('\n')))
				.setFooter(footer);

			return msg.channel.send(embed);
		} catch (error) {
			return msg.channel.send(error);
		}
	}
}

module.exports = GuildsCommand;