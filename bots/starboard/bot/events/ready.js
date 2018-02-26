const { Event } = require('../../../../');

class ReadyEvent extends Event {
	run() {
		console.log(`Logged in as ${this.client.user.tag} (${this.client.user.id})`);
		this.client.user.setActivity(`the sky | ${this.client.prefix}help`, { type: 'WATCHING' });
	}
}

module.exports = ReadyEvent;