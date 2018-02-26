const { Command } = require('../../../../../');

class ChannelCommand extends Command {
	constructor() {
		super({
			description: 'Get a link for the mentioned channel or the current one!',
			guildOnly: true,
		});
	}

	run(msg) {
		const user = msg.mentions.users.first() || msg.author;

		return msg.channel.send(`${this.client.config.site}/user/${user.id}`);
	}
}

module.exports = ChannelCommand;