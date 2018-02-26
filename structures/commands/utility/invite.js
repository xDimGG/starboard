const { Command } = require('../../../');

class InviteCommand extends Command {
	constructor() {
		super({ description: 'Get an invite link for me!' });
	}

	run(msg) {
		return msg.channel.send([
			`Invite: <https://discordapp.com/oauth2/authorize?client_id=${this.client.user.id}&scope=bot&permissions=${this.client.permissions}>`,
			this.client.invite ? `Server: ${this.client.invite}` : '',
		]);
	}
}

module.exports = InviteCommand;