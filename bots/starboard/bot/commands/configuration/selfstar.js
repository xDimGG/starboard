const { Command } = require('../../../../../');

class SelfStar extends Command {
	constructor() {
		super({
			description: 'Toggles the self-star warning.',
			memberPerms: 'MANAGE_MESSAGES',
		});
	}

	async run(msg) {
		const selfStar = this.client.settings.get(msg.guild.id, 'selfstar', true);
		if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.owner) return msg.channel.send(`Self-star warnings are currently ${selfStar ? 'enabled' : 'disabled'}.`);
		await this.client.settings.set(msg.guild.id, 'selfstar', !selfStar);

		return msg.channel.send(`Self-star warnings are now ${selfStar ? 'enabled' : 'disabled'}.`);
	}
}

module.exports = SelfStar;
