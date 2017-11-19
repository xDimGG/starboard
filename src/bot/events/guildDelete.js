const update = require('../utils/update');

exports.run = (guild, { client, starboard }) => {
	starboard.deleteAll(guild.id);
  update(client);
};