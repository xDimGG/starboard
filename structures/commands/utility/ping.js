const { Command } = require('../../../');

class PingCommand extends Command {
	constructor() {
		super({ description: 'Obligatory ping command.' });
	}

	async run(msg) {
		const start = Date.now();
		const sent = await msg.channel.send('Pinging...');

		return sent.edit([
			'Pong!',
			`Ping: ${Date.now() - start}ms`,
			`Beat: ${Math.floor(this.client.ping)}ms`,
		]);
	}
}

module.exports = PingCommand;