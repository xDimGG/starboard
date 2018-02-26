const { Event } = require('../../../../');
const { Constants: { OPCodes } } = require('discord.js');
const { join } = require('path');
const fs = require('fs');
const events = new Map(
	fs.readdirSync(join(__dirname, 'raw')).map(file => [
		file.split('.')[0],
		require(join(__dirname, 'raw', file)), // eslint-disable-line global-require
	])
);

class RawEvent extends Event {
	async run({ d, t, op }) {
		if (op !== OPCodes.DISPATCH) return;
		// console.dir({ d, t, op }, { depth: null });
		if (!events.has(t)) return;
		try {
			await new Promise(r => setTimeout(r, 50));
			const event = events.get(t);
			await event.run(d, this.client);
		} catch (error) {
			console.log('Error!');
			console.log(`Event: ${t}`);
			console.error(error);
		}
	}
}

module.exports = RawEvent;