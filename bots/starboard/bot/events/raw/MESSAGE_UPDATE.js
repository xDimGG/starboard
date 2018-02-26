const edit = require('../../utils/edit');
const get = require('../../utils/get');

exports.run = async (data, client) => {
	const sent = await client.starboard.getSent(data.id);
	if (!sent) return;

	const channel = client.channels.get(data.channel_id);
	if (!channel || channel.type !== 'text') return;

	const board = client.findStarboard(channel.guild, channel.nsfw);
	if (!board || board.id === channel.id) return;

	const message = await get(data.id, channel, client);
	if (!message) return;

	const emoji = client.settings.get(channel.guild.id, 'emoji', client.config.emoji);
	const minimum = client.settings.get(channel.guild.id, 'minimum', 1);
	const reactions = message.reactions.has(emoji)
		? message.reactions.get(emoji).count - (message.reactions.get(emoji).users.has(message.author.id) ? 1 : 0)
		: 0;
	if (reactions < minimum)
		return client.starboard.delete(message.id, channel);

	const embed = client.generateEmbed(message, reactions);
	try {
		await edit(board, sent, embed);
		await client.starboard.update(message, reactions);
	} catch (_) {}
};

/**
{
	type: 0,
	tts: false,
	timestamp: '2018-01-13T17:48:23.785000+00:00',
	pinned: false,
	nonce: null,
	mentions: [],
	mention_roles: [],
	mention_everyone: false,
	id: '401794625846902784',
	embeds: [],
	edited_timestamp: '2018-01-13T17:48:27.599186+00:00',
	content: 'asdff',
	channel_id: '398605469406593025',
	author: {
		username: 'Dim',
		id: '219204779426054146',
		discriminator: '4464',
		avatar: 'f1e3767fbbc573066c41d48ee448d645'
	},
	attachments: []
}
*/