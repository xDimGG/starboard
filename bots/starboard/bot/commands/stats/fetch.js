const { Command } = require('../../../../../');
const avatar = require('../../utils/avatar');
const stars = require('../../utils/stars');
const { Op } = require('sequelize');

class FetchCommand extends Command {
	constructor() {
		super({ description: 'Fetch a message by query.' });
	}

	async run(msg, args) {
		const opts = this.client.starboard.parseArgs(msg, args);
		const base = { where: {} };

		if (!opts.nsfw) base.where.channel_nsfw = false;
		if (opts.date) base.where.message_timestamp = { [Op.gt]: opts.date };
		if (opts.user) base.where.author_id = opts.user.id;
		if (opts.channel) base.where.channel_id = opts.channel.id;
		if (!opts.global && msg.channel.type === 'text') base.where.server_id = msg.guild.id;

		const count = await this.client.starboard.db.count(base);
		if (!count) return msg.channel.send('There aren\'t any messages to display!');
		if (count <= opts.offset) return msg.channel.send(`There ${count === 1 ? 'is' : 'are'} only ${count} message${count === 1 ? '' : 's'}.`);

		if (opts.order.ms) base.order = [['message_stars', 'DESC']];
		else if (opts.order.ls) base.order = [['message_stars', 'ASC']];
		else if (opts.order.ns) base.order = [['id', 'DESC']];
		else if (opts.order.os) base.order = [['id', 'ASC']];

		if (!base.order) base.order = [['message_stars', 'DESC']];

		const data = await this.client.starboard.db.findOne({
			attributes: [
				'author_id',
				'author_tag',
				'author_avatar',
				'channel_name',
				'message_id',
				'message_file',
				'message_stars',
				'message_content',
				'message_timestamp',
			],
			offset: opts.offset,
			limit: 1,
			...base,
		});

		const { color, emoji } = stars(data.message_stars);
		const embed = this.embed
			.setAuthor(`${data.author_tag} (${data.author_id}) in #${data.channel_name}`, avatar(data), `${this.client.config.site}/message/${data.message_id}`)
			.setColor(color)
			.setDescription(data.message_content)
			.setFooter(`${emoji} ${data.message_stars} Star${data.message_stars === 1 ? '' : 's'} • ${data.message_id} • ${opts.offset + 1} of ${count}`)
			.setImage(data.message_file)
			.setTimestamp(data.message_timestamp);

		return msg.channel.send(embed);
	}
}

module.exports = FetchCommand;