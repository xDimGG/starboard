const { MessageEmbed } = require('discord.js');
const { Client } = require('../../../../');
const Blacklists = require('./Blacklists');
const Starboard = require('./Starboard');
const image = require('../utils/image');
const stars = require('../utils/stars');

class StarboardClient extends Client {
	constructor(options) {
		super(options);

		this.blacklists = new Blacklists(this);
		this.starboard = new Starboard(this);
		this.db.sync();
	}

	findStarboard(guild, nsfw = false) {
		const phrase = nsfw ? 'starboard-nsfw' : 'starboard';
		const config = this.settings.get(guild.id, phrase);
		const channels = guild.channels.filter(channel =>
			channel.type === 'text' &&
			!nsfw || channel.nsfw &&
			channel.permissionsFor(guild.me).has('SEND_MESSAGES')
		);
		if (channels.has(config)) return channels.get(config);

		return channels.find(channel => channel.name.toLowerCase().includes(phrase));
	}

	generateEmbed(message, reactions) {
		const minimal = this.settings.get(message.guild.id, 'minimal', true);
		const { color, emoji } = stars(reactions);
		const embed = new MessageEmbed()
			.setAuthor(
				`${message.author.tag}${minimal ? ` (${message.author.id})` : ''} in #${message.channel.name}`,
				message.author.displayAvatarURL(),
				`${this.config.site}/message/${message.id}`
			)
			.setColor(color)
			.setDescription(message.content)
			.setFooter(`${emoji} ${reactions} Star${reactions === 1 ? '' : 's'}${minimal ? ` • ${message.id}` : ''}`)
			.setImage(image(message))
			.setTimestamp(message.createdAt);

		return embed;
	}
}

module.exports = StarboardClient;