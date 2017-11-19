const Starboard = require('./src/bot/utils/Starboard');
const Settings = require('./src/bot/utils/Settings');
const { token } = require('./config');
const { Client } = require('discord.js');
const { open } = require('sqlite');
const server = require('./server');
const fs = require('fs');
const client = new Client();

fs.existsSync('./src/bot/data') || fs.mkdirSync('./src/bot/data');

(async () => {
	const settings = new Settings(await open('./src/bot/data/settings.sqlite'));
	const starboard = new Starboard(await open('./src/bot/data/starboard.sqlite'));

	for (const file of fs.readdirSync('./src/bot/events')) {
		const event = file.split('.')[0];
		try {
			const mod = require(`./src/bot/events/${event}`);
			client.on(event, (...args) => mod.run(...args, { client, starboard, settings }));
		} catch (err) {
			console.log('EVENT ERROR');
			console.error(err);
		}
	}

	server(client);

	await client.login(token);
})();