exports.run = (data, client) => client.starboard.db.update({
	channel_name: data.name,
	channel_nsfw: data.nsfw,
}, { where: { channel_id: data.id } });

/**
{
	type: 0,
	topic: '',
	position: 2,
	permission_overwrites: [],
	parent_id: '393511710604132362',
	nsfw: false,
	name: 'general',
	last_message_id: null,
	id: '397127786780819477',
	guild_id: '393511709928587264'
}
*/