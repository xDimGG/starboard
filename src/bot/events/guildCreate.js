const update = require('../utils/update');

exports.run = (guild, { client, settings }) => {
  settings.create(guild.id);
  update(client);
};