const { post } = require('snekfetch');
const moment = require('moment');

exports.run = async msg => {
  if (msg.channel.type !== 'text') return msg.channel.send('This command only works in text channels.');
  const pins = await msg.channel.messages.fetchPinned();
  if (!pins.size) return msg.channel.send('There aren\'t any pinned messages!');
  const text = pins.map(msg => [
    `- ${msg.author.tag} on ${moment(msg.timestamp).format('MMMM Do YYYY [at] h:mm:ss a')}`,
    msg.member && msg.member.nickname ? ` (aka ${msg.member.nickname})` : '',
    `\r\n${msg.content}`,
    `${msg.attachments.size ? `${msg.content ? '\r\n' : ''}Attachment: ${msg.attachments.first().url}` : ''}`
  ].join('')).join('\r\n\r\n');
  const { body } = await post('https://hastebin.com/documents').send(text.replace(/\r/g, ''));
  msg.channel.send(`https://hastebin.com/${body.key}.txt`, { files: [{ attachment: Buffer.from(text), name: 'pins.txt' }] });
};