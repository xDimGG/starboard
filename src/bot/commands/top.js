const { site } = require('../../../config');

exports.run = msg => {
	if (msg.channel.type !== 'text') msg.channel.send('This command only works in text channels.');
	else msg.channel.send(`${site}/${msg.guild.id}`);
};