const { owner } = require('../../../config');

exports.run = (msg, args, { prefix, settings }) => {
  if (msg.channel.type !== 'text') return msg.channel.send('This command only works in text channels.');
	if (!args[0]) return msg.channel.send(prefix === null ? 'There is no prefix, just mention me!' : `The prefix is currently \`${prefix}\`.`);
	if (!msg.member.permissions.has('ADMINISTRATOR') && msg.author.id !== owner) return msg.reply('you don\'t have admin perms.');
	if (args[0].length > 5) return msg.reply('the prefix can\'t be longer than 5 characters.');
	if (args[0] === 'none') {
		settings.set(msg.guild.id, 'prefix', null);
		msg.channel.send('Prefix removed.');
	} else {
		settings.set(msg.guild.id, 'prefix', args.join(' '));
		msg.channel.send('Prefix changed.');
	}
};