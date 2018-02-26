const { Event } = require('../../../../');
const { MessageEmbed } = require('discord.js');

class GuildCreateEvent extends Event {
	run(guild) {
		const channel = this.client.channels.get(this.client.config.servers);
		if (!channel || !channel.guild.available) return;

		const embed = new MessageEmbed()
			.setAuthor(`${guild.name} (${guild.id})`, guild.iconURL())
			.setColor(0x5BFF5B)
			.setFooter('Joined')
			.setTimestamp();

		return channel.send(embed);
	}
}

module.exports = GuildCreateEvent;