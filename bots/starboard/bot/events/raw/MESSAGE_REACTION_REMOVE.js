const edit = require('../../utils/edit');
const get = require('../../utils/get');

exports.run = async (data, client) => {
	const channel = client.channels.get(data.channel_id);
	if (!channel || channel.type !== 'text') return;

	const emoji = client.settings.get(channel.guild.id, 'emoji', client.config.emoji);
	if (data.emoji.name !== emoji) return;

	const board = client.findStarboard(channel.guild, channel.nsfw);
	if (!board || board.id === channel.id) return;

	const message = await get(data.message_id, channel, client);
	if (!message) return;

	const blacklisted = await client.blacklists.has([message.author.id, channel.id], channel.guild.id);
	if (blacklisted) return;

	const minimum = client.settings.get(channel.guild.id, 'minimum', 1);
	const reactions = message.reactions.has(emoji) ? message.reactions.get(emoji).count : 0;

	console.log(message.reactions.get(emoji), reactions, minimum);

	if (reactions < minimum)
		return client.starboard.delete(message.id, channel);

	const embed = client.generateEmbed(message, reactions);
	const sent = await client.starboard.getSent(message.id);
	try {
		await edit(board, sent, embed);
		await client.starboard.update(message, reactions);
	} catch (_) {}
};

/**
{
	user_id: '219204779426054146',
	message_id: '397141887514968068',
	emoji: {
		name: '⭐',
		id: null,
		animated: false
	},
	channel_id: '397127776165167115'
}
*/