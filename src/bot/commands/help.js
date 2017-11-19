const { MessageEmbed } = require('discord.js');
const { color } = require('../../../config');

exports.run = (msg, args, { prefix, client }) => {
	prefix = prefix || `\`@${client.user.tag}\` `;
	const embed = new MessageEmbed()
		.setColor(color)
		.setDescription(`
		**__Site__**
		${prefix}web - link to starboard.services
		${prefix}top - link to starboard site for ${msg.channel.type === 'text' ? `**${msg.guild.name}**` : 'the server you\'re in'}
		**__Info__**
		${prefix}about - information about me
    ${prefix}help - get the commands for starboard bot
		${prefix}invite - get an invite link for me
		**__Utils__**
		${prefix}pins - get all the pins in the current channel
		${prefix}setup - setup and configure the starboard channel
		**__Config__**
		${prefix}blacklist - prevent a channel from being shown in starboard
		${prefix}blacklists - get all blacklisted channels
		${prefix}whitelist - revert blacklist
		${prefix}minimum - set the minimum amount of required stars
		${prefix}minimal - toggle minimal mode (no id, no date)
		${prefix}prefix - set the prefix of the server | \`none\` for none
		`.replace(/^(\s|\n)+/gm, ''))
		.setTitle('Commands');
	msg.channel.send(embed);
};