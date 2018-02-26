module.exports = (client, channel, message) => {
	if (client.type === 'text') [client, channel, message] = [client.client, client, channel];
	if (channel.type === 'text') channel = channel.id;

	return client.api.channels[channel].messages[message].delete();
};