const { createMessage } = require('discord.js/src/structures/shared/');
const map = new Map();

const INTERVAL = 5000;

module.exports = async (client, channel, message, options) => {
	if (client.type === 'text') [client, channel, message, options] = [client.client, client, channel, message];
	if (channel.type === 'text') channel = channel.id;

	if (typeof options === 'string') options = { content: options };

	const { data } = await createMessage(channel, options);

	const edit = () => client.api.channels[channel].messages[message].patch({ data }).catch(console.error);

	if (map.has(message)) {
		const [time, timeout] = map.get(message);
		if (time <= Date.now()) map.set(message, [Date.now() + INTERVAL]);
		else {
			clearTimeout(timeout);
			map.set(message, [Date.now() + INTERVAL, setTimeout(edit, INTERVAL)]);
		}
	} else map.set(message, [Date.now() + INTERVAL, setTimeout(edit, 0)]);
};