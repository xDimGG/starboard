const { owner } = require('../../../config');
const channel = require('../utils/channel');

exports.run = async (msg, args, { client }) => {
	if (msg.author.id !== owner) return msg.reply('only my owner can use this command.');
  let sent = 0;
  for (const guild of client.guilds.array()) {
    const sb = channel(guild);
    if (!sb) continue;
    try {
      await sb.send(args.join(' '));
      sent++;
    } catch (err) {} // eslint-disable-line no-empty
  }
  msg.channel.send(`I sent ${sent} message${sent === 1 ? '' : 's'}.`);
};