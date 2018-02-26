const { Command } = require('../../../../../');

class MinimalCommand extends Command {
	constructor() {
		super({
			description: 'Toggles minimal mode (no id, no date).',
			memberPerms: 'MANAGE_MESSAGES',
		});
	}

	async run(msg) {
		const minimal = this.client.settings.get(msg.guild.id, 'minimal', true);
		if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.owner) return msg.channel.send(`Minimal mode is currently ${minimal ? 'on' : 'off'}.`);
		await this.client.settings.set(msg.guild.id, 'minimal', !minimal);

		return msg.channel.send(`Minimal mode is now ${minimal ? 'on' : 'off'}.`);
	}
}

module.exports = MinimalCommand;