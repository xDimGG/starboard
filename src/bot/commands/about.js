const { MessageEmbed } = require('discord.js');
const { color } = require('../../../config');

exports.run = msg => {
	const embed = new MessageEmbed()
		.setColor(color)
		.setDescription(`
		I'm a bot made by the one and only [Dim](https://dim.codes).
		I don't serve any other purpose than to control starred messages.
		I was made because Dim was bored. That's it.
		For personal bot requests or if you just wanna be Dim's friend, add him \`Dim#4464\`
		`.replace(/^(\s|\n)+/gm, ''))
		.setTitle('About Me!');
	msg.channel.send(embed);
};