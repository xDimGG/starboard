const { Command } = require('../../../../../');

class ServerCommand extends Command {
	constructor() {
		super({ description: 'Get a link for the mentioned user or yourself!' });
	}

	run(msg) {
		const user = msg.mentions.users.first() || msg.author;

		return msg.channel.send(`${this.client.config.site}/user/${user.id}`);
	}
}

module.exports = ServerCommand;