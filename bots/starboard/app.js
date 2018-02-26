const handlebars = require('express-handlebars');
const socket = require('socket.io');
const express = require('express');
const http = require('http');
const config = require('./config');
const sum = arr => arr.reduce((a, b) => a + b);

module.exports = manager => {
	const app = express();
	const server = http.createServer(app);
	const io = socket.listen(server);

	app.engine('.hbs', handlebars({ extname: '.hbs' }));
	app.set('view engine', '.hbs');

	app.listen(config.port);
};