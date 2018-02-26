exports.run = (data, client) => client.starboard.delete(data.message_id, data.channel_id);

/**
{
	message_id: '401604748543000576',
	channel_id: '398605469406593025'
}
*/