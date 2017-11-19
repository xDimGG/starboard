const { prefix: p, site, owner } = require('../../../config');

exports.run = async (msg, { client, starboard, settings }) => {
	const reg = RegExp(`^<@!?${client.user.id}>`);
	const match = reg.test(msg.content);
	const prefix = msg.channel.type === 'text' ? settings.get(msg.guild.id, 'prefix') : p;
	if (msg.author.bot || prefix && !msg.content.startsWith(prefix) && !match || msg.channel.type === 'text' && !msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) return;
	const args = msg.content.slice(match ? client.user.id.length + (msg.content.startsWith('<@!') ? 4 : 3) : prefix.length).trim().split(/ +/);
	const cmd = args.shift().toLowerCase();
	try {
    const run = cmd => require(`../commands/${cmd}`).run(msg, args, { client, prefix, starboard, settings });
    if (cmd === 'eval') await run('eval');
    if (cmd === 'help') await run('help');
    if (cmd === 'pins') await run('pins');
		if (cmd === 'invite') await run('invite');
    if (cmd === 'setup') await run('setup');
		if (cmd === 'prefix') await run('prefix');
    if (cmd === 'minimal') await run('minimal');
		if (cmd === 'announce') await run('announce');
		if (['blacklists', 'blacklisted'].includes(cmd)) await run('blacklists');
		if (['wl', 'whitelist'].includes(cmd)) await run('whitelist');
		if (['bl', 'blacklist'].includes(cmd)) await run('blacklist');
		if (['min', 'minimum'].includes(cmd)) await run('minimum');
		if (['about', 'info'].includes(cmd)) await run('about');

		if (cmd === 'whos-your-daddy') msg.channel.send('`Dim#4464`');
		if (['web', 'website'].includes(cmd)) msg.channel.send(`${site}`);
		if (['top', 'leaderboard'].includes(cmd)) await run('top');
	} catch (err) {
		msg.channel.send('An error has occured, my owner has been notified.');
		console.error(err);
		const me = client.users.get(owner);
		if (me) me.send([
			`An error occured ${msg.channel.type === 'text' ? `in **${msg.guild.name}** (${msg.guild.id})` : `with \`${msg.author.tag}\``}`,
			`Command: ${cmd}`,
			'```js',
			err.stack,
			'```'
		]);
	}
};