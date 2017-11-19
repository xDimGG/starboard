const update = require('../utils/update');

exports.run = async ({ client, starboard, settings }) => {
	console.log(`Logged in as ${client.user.tag} (${client.user.id}) on ${client.guilds.size} server${client.guilds.size === 1 ? '' : 's'}`);
  client.user.setActivity('for stars', { type: 'WATCHING' });
  settings.start(client.guilds.keyArray()).then(() => {
		for (const id in settings._settings) {
			if (!client.guilds.has(id)) {
				starboard.deleteAll(id);
			}
		}
	});
  update(client);
};