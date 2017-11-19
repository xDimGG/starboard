exports.run = (msg, args, { settings }) => {
	if (msg.channel.type !== 'text') return msg.channel.send('This command only works in text channels.');
	const blacklisted = settings.get(msg.guild.id, 'blacklist');
	if (!blacklisted) return msg.channel.send('There are no blacklisted channels!');
	msg.channel.send([
		'__Blacklisted Channels__',
		blacklisted.split('|').map(b => `<#${b}>`).join(', ')
	]);
};