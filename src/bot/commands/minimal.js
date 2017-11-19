const { owner } = require('../../../config');

exports.run = (msg, args, { settings }) => {
  if (msg.channel.type !== 'text') return msg.channel.send('This command only works in text channels.');
  if (!msg.member.permissions.has('MANAGE_CHANNELS') && msg.author.id !== owner) return msg.reply('you don\'t have the manage channels permission.');
  const minimal = settings.get(msg.guild.id, 'minimal') === '1';
  settings.set(msg.guild.id, 'minimal', minimal ? '0' : '1');
  msg.channel.send(minimal ? 'Minimal mode now off' : 'Minimal mode now on');
};