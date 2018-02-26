exports.run = (data, client) => {
	const info = {};
	if ('username' in data.user && 'discriminator' in data.user)
		info.author_tag = `${data.user.username}#${data.user.discriminator}`;
	if ('avatar' in data.user)
		info.author_avatar = data.user.avatar;
	if (Object.keys(info).length)
		return client.starboard.db.update(info, { where: { author_id: data.user.id } });
};

/**
{
	user: {
		username: 'Fat Cunt',
		id: '170336523772755968',
		discriminator: '6680',
		avatar: 'fc3e3cc0dffe3a8fe06e9ff118adff0d'
	},
	status: 'online',
	roles: [],
	nick: null,
	guild_id: '396071913866264576',
	game: null
}
*/