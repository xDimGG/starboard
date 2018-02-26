module.exports = (id, channel, client) => {
	if (!channel.id) channel = client.channels.get(channel);
	if (!channel || channel.type !== 'text' || !channel.permissionsFor(channel.guild.me).has('VIEW_CHANNEL')) return Promise.resolve();

	return channel.messages.has(id)
		? Promise.resolve(channel.messages.get(id))
		: channel.messages.fetch(id);
};