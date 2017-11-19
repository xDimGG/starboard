const { ShardingManager } = require('discord.js');
const { token } = require('./config');
const server = require('./server');
const manager = new ShardingManager('./bot.js', { token });
let ready = 0;

manager.on('launch', shard => {
	console.log(`Launched shard ${shard.id + 1}/${manager.shards.size}`);
});

manager.on('message', (shard, message) => {
	if (message === 'ready') {
		ready++;
		if (ready === manager.shards.size) {
			server(manager);
			// manager.shards.first().eval('client.guilds.map(g => g.memberCount)').then(console.log);
		}
	}
});

manager.spawn();