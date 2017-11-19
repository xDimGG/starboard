const { owner } = require('../../../config');
const channel = require('../utils/channel');

exports.run = async msg => {
	if (msg.channel.type !== 'text') return msg.channel.send('This command only works in text channels.');
	if (!msg.member.permissions.has('MANAGE_CHANNELS') && msg.author.id !== owner) return msg.reply('you don\'t have the manage channels permission.');
	if (!msg.guild.me.hasPermission('MANAGE_CHANNELS')) return msg.reply('i don\'t have the permissions to do that.');
	const c = channel(msg.guild) || await msg.guild.createChannel('starboard', 'text');
	await c.overwritePermissions(msg.guild.defaultRole, { SEND_MESSAGES: false, ADD_REACTIONS: false });
	await msg.channel.send(`${c} is ready to be used as the starboard channel.`);
};