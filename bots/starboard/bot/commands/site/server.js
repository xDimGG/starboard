const { Command } = require('../../../../../');

class ServerCommand extends Command {
	constructor() {
		super({
			description: 'Get a link for the current server!',
			guildOnly: true,
		});
	}

	run(msg) {
		return msg.channel.send(`${this.client.config.site}/server/${msg.guild.id}`);
	}
}

module.exports = ServerCommand;