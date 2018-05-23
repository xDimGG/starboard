const { Command } = require('../../../../../');

class SelfStar extends Command {
	constructor() {
		super({
			description: 'Toggles the ability to self-star.',
			memberPerms: 'MANAGE_MESSAGES'
		});
	}
	async run(msg) {
		const selfstar = this.client.settings.get(msg.guild.id, 'selfstar', true);
		if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.owner) return msg.channel.send(`Self-starring is currently ${selfstar ? 'enabled' : 'disabled'}.`);
		await this.client.settings.set(msg.guild.id, 'selfstar', !selfstar);

		return msg.channel.send(`Self-starring is now ${selfstar ? 'enabled' : 'disabled'}.`);
	}
}

module.exports = SelfStar;
