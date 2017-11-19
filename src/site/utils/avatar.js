const base = 'https://cdn.discordapp.com';

module.exports = msg => msg.author_icon
  ? `${base}/avatars/${msg.author_id}/${msg.author_icon}.png`
  : `${base}/embed/avatars/${msg.author_tag.split('#')[1] % 5}.png`;