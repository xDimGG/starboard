const Client = require('./bot/structures/Client');
const config = require('./config');
const { join } = require('path');

const client = new Client({
	db: {
		// logging: console.log,
		storage: join(__dirname, 'data.sqlite'),
	},
	// icon: config.icon,
	color: config.color,
	owner: config.owner,
	invite: 'https://discord.gg/MZCKAtF',
	prefix: config.prefix,
	logging: config.logs,
	disableEveryone: true,
	disabledEvents: ['TYPING_START'],
});

client
	.addEvents(join(__dirname, 'bot', 'events'))
	.addCommands(join(__dirname, 'bot', 'commands'));

client.config = config;

process.on('unhandledRejection', console.error);
client.login(config.token);