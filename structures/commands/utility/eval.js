const { Command } = require('../../../');
const { inspect } = require('util');

class EvalCommand extends Command {
	constructor() {
		super({
			description: 'Evaluates input.',
			ownerOnly: true,
		});
	}

	async run(msg, args) {
		const arg = args.join(' ');
		let errored = false;
		let evaled;
		const start = Date.now();
		try {
			evaled = await eval(arg);
		} catch (error) {
			evaled = error;
			errored = true;
		}
		const end = Date.now() - start;
		evaled = inspect(evaled, { depth: 1 });
		const len = evaled.length >= 1600 ? 1600 : evaled.length;

		return msg.channel.send([
			'📥 Input',
			this.code(this.clean(arg, 1900 - len), 'js'),
			`${'📤'} ${errored ? 'Error' : 'Output'} ${end}ms`,
			this.code(this.clean(evaled.split(this.client.token).join('[TOKEN]'), len), 'js'),
		]);
	}

	clean(str, len) {
		return this.trim(str = str.replace(/`/g, '`\u200b'), len);
	}
}

module.exports = EvalCommand;