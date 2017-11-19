const { owner } = require('../../../config');

exports.run = (msg, args, { settings }) => {
	if (msg.channel.type !== 'text') return msg.channel.send('This command only works in text channels.');
	if (!msg.member.permissions.has('MANAGE_CHANNELS') && msg.author.id !== owner) return msg.reply('you don\'t have the manage channels permission.');
	const channel = msg.mentions.channels.first();
	if (!channel) return msg.reply('you need to mention the channel you want me to blacklist.');
	const channels = settings.get(msg.guild.id, 'blacklist');
	const c = channels ? channels.split('|') : [];
	if (c.includes(channel.id)) return msg.channel.send(`${channel} is already blacklisted.`);
	c.push(channel.id);
	settings.set(msg.guild.id, 'blacklist', c.join('|'));
	msg.channel.send(`I blacklisted ${channel}`);
};