const { ShardingManager } = require('discord.js');
const { token } = require('./config');
const { join } = require('path');
const app = require('./app');
const manager = new ShardingManager(join(__dirname, 'bot.js'), { token });

manager.on('shardCreate', shard => console.log(`Launching shard ${shard.id + 1}/${manager.totalShards}`));

app(manager);
manager.spawn();