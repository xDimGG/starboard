const { port } = require('./config');
const { open } = require('sqlite');
const { join } = require('path');
const markdown = require('./src/site/utils/markdown');
const avatar = require('./src/site/utils/avatar');
const info = require('./src/bot/utils/info');
const socket = require('socket.io');
const express = require('express');
const moment = require('moment');
const http = require('http');

process.on('unhandledRejection', console.error);

module.exports = async bot => {
	const app = express();
	const server = http.createServer(app);
	const io = socket.listen(server);
	const db = await open('./src/bot/data/starboard.sqlite');
	const messages = async () => (await db.get('SELECT COUNT() FROM messages'))['COUNT()'];
	const stars = async () => (await db.all('SELECT message_stars FROM messages')).map(msg => msg.message_stars).reduce((a, b) => a + b);
	const format = data => {
		data.author_icon = avatar(data);
		data.star = info(data.message_stars).emoji;
		data.message_content = markdown(data.message_content);
		data.message_created = moment(data.message_created).format('MMMM Do YYYY [at] h:mma');
		delete data.server_name;
		delete data.message_sent;
		return data;
	};
	const random = async (guild) => {
		if (guild) {
			return await db.get('SELECT * FROM messages WHERE server_id = (?) ORDER BY RANDOM() LIMIT 1', guild);
		} else {
			return await db.get('SELECT * FROM messages ORDER BY RANDOM() LIMIT 1');
		}
	};

	app.set('views', './src/site/views');
	app.set('view engine', 'ejs');

	app.use('/static', express.static('./src/site/static'));
	app.use('/favicon.ico', (req, res) => res.sendFile(join(__dirname, 'src', 'site', 'static', 'favicon.ico')));

	app.get('/api/random', async (req, res) => {
		res.json(format(await random()));
	});

	app.get('/api/:server/random', async (req, res) => {
		const { server } = req.params;
		const msg = await random(server);
		if (msg) res.json(format(msg));
		else res.sendStatus(404);
	});

	app.get('/api', (req, res) => {
		res.send(`
		hi, i won't be bothered to make an actual api documentation cause there's not that much really
		it's just /api/:server/random and /api/random
		:server is the id of a server
		the sent property is the id of the message the bot send in the #starboard channel of that guild
		guild is id of the guild
		id is the id of the original message
		that's really all, feel free to support me or something <a href="https://dim.codes">https://dim.codes</a>
		`.trim().split('\n').map(s => s.trim()).join('<br>'));
	});

	app.get('/terms', (req, res) => {
		res.send('By using the Discord bot Starboard#1330 (349626729226305537), you are allowing your viewable information from Discord to be shown on starboard.services');
	});

	app.get('/:server/:message', async (req, res) => {
		const { server, message } = req.params;
		const msg = await db.get('SELECT * FROM messages WHERE server_id = (?) AND message_id = (?)', server, message);
		if (!msg) return res.sendStatus(404);
		res.render('message', {
			title: 'Message',
			msg: format(msg),
			guilds: bot.guilds.size,
			users: bot.guilds.map(g => g.memberCount).reduce((a, b) => a + b),
			messages: await messages(),
			stars: await stars()
		});
	});

	app.get('/:server', async (req, res) => {
		const { server } = req.params;
		const msg = await random(server);
		if (!msg) return res.sendStatus(404);
		res.render('server', {
			title: 'Server',
			msg: format(msg),
			guilds: bot.guilds.size,
			users: bot.guilds.map(g => g.memberCount).reduce((a, b) => a + b),
			messages: await messages(),
			stars: await stars()
		});
	});

	app.get('/', async (req, res) => {
		const msg = await random();
		if (!msg) return res.sendStatus(404);
		res.render('index', {
			title: 'Messages',
			msg: format(msg),
			guilds: bot.guilds.size,
			users: bot.guilds.map(g => g.memberCount).reduce((a, b) => a + b),
			messages: await messages(),
			stars: await stars()
		});
	});

	io.on('connection', client => {
		client.on('request', guild => {
			random(guild).then(msg => {
				client.emit('response', format(msg));
			});
		});
	});

	const updateGuilds = () => io.sockets.emit('guild', bot.guilds.size);
	const updateUsers = () => io.sockets.emit('user', bot.guilds.map(g => g.memberCount).reduce((a, b) => a + b));
	const updateMessages = async () => io.sockets.emit('message', await messages());
	const updateStars = async () => io.sockets.emit('star', await stars());

	bot.on('ready', updateGuilds);
	bot.on('gulildCreate', updateGuilds);
	bot.on('gulildDelete', updateGuilds);

	bot.on('star', updateMessages);
	bot.on('starCount', updateStars);

	bot.on('guildMemberAdd', updateUsers);
	bot.on('guildMemberRemove', updateUsers);

	server.listen(port, () => console.log(`Listening on port ${port}`));
};