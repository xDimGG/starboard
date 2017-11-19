const { owner } = require('../../../config');

exports.run = (msg, args, { settings }) => {
  if (msg.channel.type !== 'text') return msg.channel.send('This command only works in text channels.');
  if (!args[0]) return msg.channel.send(`The current minimum stars is ${settings.get(msg.guild.id, 'minimum')}`);
  if (!msg.member.permissions.has('MANAGE_CHANNELS') && msg.author.id !== owner) return msg.reply('you don\'t have the manage channels permission.');
  if (args[0] < 1 || args[0] > 100) return msg.channel.send('The minimum must be at least 1 and at most 100');
  settings.set(msg.guild.id, 'minimum', args[0]);
  msg.channel.send(`The minimum stars required is now ${args[0]}`);
};