const { Command } = require('../../../../../');

class QueryCommand extends Command {
	constructor() {
		super({ description: 'List some query parameters and examples.' });
	}

	run(msg) {
		return msg.channel.send([
			'The commands in the stats group accept the following parameters (with some exceptions).',
			'Note that if a message is sent in an NSFW channel, NSFW message can be shown.',
			'',
			this.list(`
				mention - filter out everything but the mentioned user or channel
				number - if a number is provided, that will be the page

				\`--global\` [-g] Include stars outside of this server
				\`--most-stars\` [-ms] Sort by stars (descending)
				\`--least-stars\` [-ls] Sort by stars (ascending)
				\`--newest-stars\` [-ns] Sort by when the message was starred (descending)
				\`--oldest-stars\` [-os] Sort by when the message was starred (ascending)

				\`--last-day\` [-ld] Only include messages sent within the last day
				\`--last-week\` [-lw] Only include messages sent within the last week
				\`--last-month\` [-lm] Only include messages sent within the last month
				\`--last-year\` [-ly] Only include messages sent within the last year
			`),
			'',
			'**Examples**',
			`${msg.prefix}fetch ${this.client.user} --least-stars --global | gets my least starred message`,
		]);
	}
}

module.exports = QueryCommand;