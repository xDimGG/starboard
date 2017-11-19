const { owner } = require('../../../config');
const { inspect } = require('util');

// eslint-disable-next-line no-unused-vars
exports.run = async (msg, args, { client, starboard, settings }) => {
	if (msg.author.id !== owner) return msg.reply('only my owner can use this command.');
	const code = args.join(' ');
	const start = process.hrtime();
	try {
		const evaled = inspect(await eval(code), { depth: 1 }).replace(RegExp(client.token, 'g'), '[TOKEN]');
		msg.channel.send([
			`📥 **INPUT**`,
			'```js',
			`${code.substring(0, 300) || 'undefined'}${code.length > 300 ? `... (${code.length - 300} more characters)` : ''}`,
			'```',
			`📤 **OUTPUT** ${process.hrtime(start).join('.')}ms`,
			'```js',
			`${evaled.substring(0, 1600) || 'undefined'}${evaled.length > 1600 ? `... (${evaled.length - 1600} more characters)` : ''}`,
			'```'
		]);
	} catch (err) {
		msg.channel.send([
			`📥 **INPUT**`,
			'```js',
			`${code.substring(0, 300) || 'undefined'}${code.length > 300 ? `... (${code.length - 300} more characters)` : ''}`,
			'```',
			`📤 **OUTPUT** ${process.hrtime(start).join('.')}ms`,
			'```js',
			err || 'undefined',
			'```'
		]);
	}
};