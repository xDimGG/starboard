const { owner } = require('../../../config');

exports.run = async (msg, args, { client }) => {
	if (msg.author.id === owner && args[0]) {
		const guild = client.guilds.get(args[0]) || client.guilds.find('name', args.join(' '));
		if (!guild) return msg.channel.send('I couldn\'t find that server.');
		const channel = guild.channels.filter(c => c.permissionsFor(c.guild.me).has('CREATE_INSTANT_INVITE')).first();
		if (!channel) return msg.channel.send('I couldn\'t find a channel to create an invite.');
		const invite = await channel.createInvite();
		msg.channel.send(invite.url);
	} else {
		msg.channel.send([
			'__With Moderator Permissions__',
			`<https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=8>`,
			'__Without Moderator Permissions__',
			`<https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot>`
		]);
	}
};