class Event {
	constructor(client) {
		this.client = client;
	}

	run() {
		throw new Error(`${this.constructor.name} doesn't have a run function.`);
	}
}

module.exports = Event;