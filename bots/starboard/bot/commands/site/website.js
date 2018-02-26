const { Command } = require('../../../../../');

class WebCommand extends Command {
	constructor() {
		super({
			aliases: ['site'],
			description: 'Get a link to my website!',
		});
	}

	run(msg) {
		return msg.channel.send(this.client.config.site);
	}
}

module.exports = WebCommand;