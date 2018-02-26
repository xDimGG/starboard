const Sequelize = require('sequelize');
const image = require('../utils/image');
const html = require('../utils/html');
const del = require('../utils/del');

class Starboard {
	constructor(client) {
		this.client = client;
		this.db = client.db.define('starboard', {
			// Author
			author_id: Sequelize.STRING,
			author_tag: Sequelize.STRING,
			author_avatar: Sequelize.STRING,
			// Channel
			channel_id: Sequelize.STRING,
			channel_name: Sequelize.STRING,
			channel_nsfw: Sequelize.BOOLEAN,
			// Server
			server_id: Sequelize.STRING,
			server_name: Sequelize.STRING,
			// Message
			message_id: Sequelize.STRING,
			message_file: Sequelize.STRING,
			message_stars: Sequelize.INTEGER,
			message_content: Sequelize.TEXT,
			message_html: Sequelize.TEXT,
			message_timestamp: Sequelize.DATE,
			// Sent
			sent: Sequelize.STRING,
		});
	}

	get(id) {
		return this.db.findOne({ where: { message_id: id } });
	}

	getSent(id) {
		return this.db.findOne({ where: { message_id: id }, attributes: ['sent'] }).then(row => row && row.sent);
	}

	exists(id) {
		return this.db.findOne({ where: { message_id: id } });
	}

	async delete(id, channel) {
		const row = await this.db.findOne({ where: { message_id: id }, attributes: ['sent'] });
		if (!row) return;
		if (!channel.id) channel = this.client.channels.get(channel);
		const starboard = this.client.findStarboard(channel.guild, channel.nsfw);
		try {
			await del(starboard, row.sent);
		} catch (_) {}

		return this.db.destroy({ where: { message_id: id } });
	}

	deleteAll(id) {
		return this.db.destroy({ where: { server_id: id } });
	}

	create(message, stars, sent) {
		console.log(`New starred message in "${message.guild.name}" (${message.guild.id}). ${message.author.id}`);

		return this.db.create({
			author_id: message.author.id,
			author_tag: message.author.tag,
			author_avatar: message.author.avatar,

			channel_id: message.channel.id,
			channel_nsfw: message.channel.nsfw,
			channel_name: message.channel.name,

			server_id: message.guild.id,
			server_name: message.guild.name,

			message_id: message.id,
			message_file: image(message),
			message_stars: stars,
			message_content: message.content,
			message_html: html(message.content, message.guild, this.client),
			message_timestamp: message.createdTimestamp,

			sent,
		});
	}

	update(message, stars) {
		return this.db.update({
			author_tag: message.author.tag,
			author_avatar: message.author.avatar,

			channel_nsfw: message.channel.nsfw,
			channel_name: message.channel.name,

			server_name: message.guild.name,

			message_file: image(message),
			message_stars: stars,
			message_content: message.content,
			message_html: html(message.content, message.guild, this.client),
		}, { where: { message_id: message.id } });
	}

	parseArgs(msg, args) {
		const has = string => args.some(arg => string.split('|').includes(arg.toLowerCase()));

		return {
			nsfw: msg.channel.nsfw,
			date: this.parseDays(has),
			user: msg.mentions.users.first(),
			channel: msg.mentions.channels.first(),
			order: {
				ms: has('-ms|--most-stars|--highest-stars'),
				ls: has('-ls|--least-stars|--lowest-stars'),
				ns: has('-ns|--newest-stars|--recent-stars|--last-stars'),
				os: has('-os|--oldest-stars'),
			},
			global: has('-g|--global'),
			offset: (args.find(arg => /^\d+$/.test(arg)) || 1) - 1,
		};
	}

	parseDays(has) {
		const days = time => new Date(Date.now() - (1000 * 60 * 60 * 24 * time));

		if (has('-ld|--last-day')) return days(1);
		if (has('-lw|--last-week')) return days(7);
		if (has('-lm|--last-month')) return days(31);
		if (has('-ly|--last-year')) return days(365);
	}
}

module.exports = Starboard;