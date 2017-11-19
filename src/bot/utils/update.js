const { tokens } = require('../../../config');
const { post } = require('snekfetch');

module.exports = async client => {
  if (tokens) {
		for (const host in tokens) {
			try {
				await post(`https://${host}/api/bots/${client.user.id}/stats`)
					.set('Authorization', 'API TOKEN')
					.send({ server_count: client.guilds.size });
			} catch (err) {
				console.log(`POST Error to ${host}`);
				console.error(err);
			}
		}
  }
  return true;
};