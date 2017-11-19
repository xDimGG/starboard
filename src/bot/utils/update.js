const { bots_token } = require('../../../config');
const { post } = require('snekfetch');

module.exports = async client => {
  if (bots_token) {
    try {
      await post(`https://bots.discord.pw/api/bots/${client.user.id}/stats`)
				.set('Authorization', bots_token)
				.set('Content-Type', 'application/json')
        .send({ server_count: client.guilds.size });
    } catch (err) {
			console.log('POST Error to bots.discord.pw');
			console.error(err);
		}
  }
  return true;
};