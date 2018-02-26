const { Command } = require('../../../../../');
const Discord = require('discord.js');
const { version } = require('../../../package.json');

class StatsCommand extends Command {
	constructor() {
		super({
			aliases: ['info'],
			description: 'Some of my stats.',
		});
	}

	async run(msg) {
		const messages = await this.client.starboard.db.count();
		const total = await this.client.starboard.db.sum('message_stars');
		const [members, servers, channels] = await Promise.all([this.members(), this.servers(), this.channels()]);
		const embed = this.embed
			.setAuthor('Starboard\'s Stats', this.icon, this.client.config.site)
			.setFooter(`Do ${msg.prefix}about to learn what I do!`)
			.addField(this.title('Process Stats'), this.list(`
				Uptime: ${this.time(this.client.uptime)}
				Memory Usage: ${Math.round(process.memoryUsage().heapTotal / 2 ** 20)}MB
				Starboard Version: ${version}
				DiscordJS Version: ${Discord.version}
				NodeJS Version: ${process.version.slice(1)}
			`))
			.addField(this.title('Bot Stats'), this.list(`
				Total Members: ${members}
				Total Servers: ${servers}
				Total Channels: ${channels}
				${this.client.shard ? `Total Shards: ${this.client.shard.count}` : ''}
			`))
			.addField(this.title('Starboard Stats'), this.list(`
				Total Stars: ${total || 0}
				Total Messages: ${messages || 0}
			`));

		return msg.channel.send(embed);
	}

	time(ms) {
		const s = int => int === 1 ? '' : 's';
		const [day, hr, min, sec] = [
			ms / 6048e5,
			ms / 36e5 % 24,
			ms / 60e3 % 60,
			ms / 1e3 % 60,
		].map(Math.floor);

		return `${day} day${s(day)}, ${hr} hour${s(hr)}, ${min} minute${s(min)}, and ${sec} second${s(sec)}`;
	}

	sum(num) {
		return num.reduce((a, b) => a + b);
	}

	members() {
		return this.client.shard
			? this.client.shard.broadcastEval('this.guilds.reduce((a, b) => a + b.memberCount, 0)').then(this.sum)
			: Promise.resolve(this.client.guilds.reduce((a, b) => a + b.memberCount, 0));
	}

	servers() {
		return this.client.shard
			? this.client.shard.broadcastEval('this.guilds.size').then(this.sum)
			: Promise.resolve(this.client.guilds.size);
	}

	channels() {
		return this.client.shard
			? this.client.shard.broadcastEval('this.channels.size').then(this.sum)
			: Promise.resolve(this.client.channels.size);
	}
}

module.exports = StatsCommand;