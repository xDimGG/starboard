const { Event } = require('../../../../');
const { MessageEmbed } = require('discord.js');

class GuildMemberAddEvent extends Event {
	run(member) {
		const channel = this.client.channels.get(this.client.config.members);
		if (!channel || channel.guild.id !== member.guild.id || !channel.guild.available) return;

		const embed = new MessageEmbed()
			.setAuthor(`${member.displayName} (${member.id})`, member.displayAvatarURL)
			.setColor(0x5BFF5B)
			.setFooter('Joined')
			.setTimestamp();

		return channel.send(embed);
	}
}

module.exports = GuildMemberAddEvent;