const { Event } = require('../../../../');
const { MessageEmbed } = require('discord.js');

class GuildMemberRemoveEvent extends Event {
	run(member) {
		const channel = this.client.channels.get(this.client.config.members);
		if (!channel || channel.guild.id !== member.guild.id || !channel.guild.available) return;

		const embed = new MessageEmbed()
			.setAuthor(`${member.displayName} (${member.id})`, member.displayAvatarURL)
			.setColor(0xFF3838)
			.setFooter('Left')
			.setTimestamp();

		return channel.send(embed);
	}
}

module.exports = GuildMemberRemoveEvent;