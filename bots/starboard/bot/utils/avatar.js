const base = 'https://cdn.discordapp.com';

module.exports = data => data.author_avatar
	? `${base}/avatars/${data.author_id}/${data.author_avatar}.${data.author_avatar.startsWith('a_') ? 'gif' : 'png'}`
	: `${base}/embed/avatars/${data.author_tag.split('#')[1] % 5}`;