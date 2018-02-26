const { Command } = require('../../../../../');

class BlacklistsCommand extends Command {
	constructor() {
		super({
			description: 'Lists blacklisted users and channels.',
			memberPerms: 'MANAGE_MESSAGES',
		});
	}

	async run(msg) {
		const rows = await this.client.blacklists.db.findAll({ where: { guild: msg.guild.id } });
		if (!rows.length) return msg.channel.send('This server has no blacklists!');
		const embed = this.embed.setAuthor('Blacklists', msg.guild.iconURL() || this.icon, this.client.config.site);
		const users = rows.filter(row => row.type === 'user');
		const channels = rows.filter(row => row.type === 'channel');
		if (users.length) embed.addField(this.title('Users'), this.map(users));
		if (channels.length) embed.addField(this.title('Channels'), this.map(channels));

		return msg.channel.send(embed);
	}

	map(rows) {
		const arr = [];
		let len = 0;
		for (const row of rows) {
			if ((len += row.length + 5) > 1024) break;
			arr.push(row);
		}

		return arr.map(row => `<${row.type === 'user' ? '@' : '#'}${row.id}>`).join(', ');
	}
}

module.exports = BlacklistsCommand;