module.exports = guild => guild.channels
  .filter(channel => channel.type === 'text' && channel.permissionsFor(guild.me).has('SEND_MESSAGES'))
  .find(channel => channel.name.toLowerCase() === 'starboard');