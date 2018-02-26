const { Command } = require('../../../../../');

class AboutCommand extends Command {
	constructor() {
		super({ description: 'Some information about me!' });
	}

	run(msg) {
		const embed = this.embed
			.setAuthor('About Me', this.icon, this.client.config.site)
			.setFooter(`Do ${msg.prefix}stats for some numbers!`)
			.addField(this.title('FAQ'), [
				'Q: What\'s a starboard?',
				'A: A starboard would be best desribed as a public pinning system.',
				'',
				'Here\'s what happens:',
				'1) You see a message that you like (for whatever reason).',
				'2) You react to the message with a star emoji (or whatever your server set).',
				'3) The message then gets sent to a starboard channel.',
				'4) If the message is already in the starboard, the message is updated according to the number of stars the message has.',
			])
			.addField(this.title('TOS'), 'By using this bot, you\'re agreeing to some information (name, discriminator, avatar, etc.) to be shown across Discord and on the starboard site.');

		return msg.channel.send(embed);
	}
}

module.exports = AboutCommand;