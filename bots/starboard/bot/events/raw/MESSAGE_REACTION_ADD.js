const edit = require('../../utils/edit');
const get = require('../../utils/get');
const warned = {};

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

	const removeBotReacts = client.settings.get(channel.guild.id, 'removebotreacts', true);

	const reactor = await client.users.get(data.user_id);
	if (reactor.bot)
		if (removeBotReacts)
			return message.reactions.get(emoji).users.remove(data.user_id);

	const selfStar = client.settings.get(channel.guild.id, 'selfstar', false);

	if (message.author.id === data.user_id && !selfStar) {
		if (!warned[message.id] && channel.permissionsFor(client.user).has('SEND_MESSAGES'))
			message.reply('you can\'t star your own messages!');

		if (channel.permissionsFor(channel.guild.me).has('MANAGE_MESSAGES') && message.reactions.has(emoji))
			message.reactions.get(emoji).users.remove(data.user_id);

		return warned[message.id] = true;
	}

	const minimum = client.settings.get(channel.guild.id, 'minimum', 1);
	const reactions = message.reactions.has(emoji) ? message.reactions.get(emoji).count : 0

	if (reactions < minimum) return;

	const embed = client.generateEmbed(message, reactions);
	const sent = await client.starboard.getSent(message.id);
	if (sent)
		try {
			await edit(board, sent, embed);
			await client.starboard.update(message, reactions);
		} catch (_) {}
	else {
		const { id } = await board.send(embed);
		await client.starboard.create(message, reactions, id);
	}
};

/**
{
	user_id: '219204779426054146',
	message_id: '398594455445438464',
	emoji: {
		name: '⭐',
		id: null,
		animated: false
	},
	channel_id: '397142087369490432'
}
*/
