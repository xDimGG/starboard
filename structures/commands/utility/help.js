const { Command } = require('../../../');

class HelpCommand extends Command {
	constructor() {
		super({ description: 'Lists my commands.' });
	}

	run(msg) {
		const groups = [...new Set(this.client.commands.map(command => command.options.group))].sort();
		const embed = this.embed.setAuthor('Commands', this.icon);
		for (const group of groups)
			embed.addField(
				this.title(`${group[0].toUpperCase()}${group.slice(1)}`),
				this.client.commands
					.filter(command => command.options.group === group)
					.sort()
					.filter(command => command.options.ownerOnly ? this.client.isOwner(msg.author.id) : true)
					.map(({ options }) => `\`${msg.prefix}${options.name} ${options.usage}\`${options.description ? ` - ${options.description}` : ''}`),
			);

		return msg.channel.send(embed);
	}
}

module.exports = HelpCommand;