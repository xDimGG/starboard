const { Command } = require('../../../../../');
const Sequelize = require('sequelize');
const PAGE_SIZE = 10;

class LeaderboardCommand extends Command {
	constructor() {
		super({ description: 'List the top starred people by query!' });
	}

	async run(msg, args) {
		const opts = this.client.starboard.parseArgs(msg, args);
		const base = { where: {} };

		if (opts.date) base.where.message_timestamp = { [Sequelize.Op.gt]: opts.date };
		if (opts.channel) base.where.channel_id = opts.channel.id;
		if (!opts.global && msg.channel.type === 'text') base.where.server_id = msg.guild.id;

		const { dataValues } = await this.client.starboard.db.findOne({
			attributes: [[Sequelize.literal('COUNT(DISTINCT(author_id))'), 'count']],
			...base,
		});
		const count = Math.ceil(dataValues.count / PAGE_SIZE);
		if (!count) return msg.channel.send('There aren\'t any pages to display!');
		if (count <= opts.offset) return msg.channel.send(`There ${count === 1 ? 'is' : 'are'} only ${count} page${count === 1 ? '' : 's'}.`);

		const sum = Sequelize.literal('sum');
		if (opts.order.ms) base.order = [[sum, 'DESC']];
		else if (opts.order.ls) base.order = [[sum, 'ASC']];

		if (!base.order) base.order = [[sum, 'DESC']];

		const users = await this.client.starboard.db.findAll({
			attributes: [
				[Sequelize.fn('SUM', Sequelize.col('message_stars')), 'sum'],
				'author_tag',
			],
			group: 'author_id',
			offset: opts.offset * PAGE_SIZE,
			limit: PAGE_SIZE,
			...base,
		});

		const embed = this.embed
			.setAuthor('Starboard\'s Leaderboards', this.icon, this.client.config.site)
			.setColor(this.color)
			.setFooter(`Page ${opts.offset + 1} of ${count}`)
			.addField('User', users.map(user => user.dataValues.author_tag), true)
			.addField('Stars', users.map(user => user.dataValues.sum), true);

		return msg.channel.send(embed);
	}
}

module.exports = LeaderboardCommand;