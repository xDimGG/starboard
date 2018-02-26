const { Client: _Client, Collection, Constants: { APIErrors } } = require('discord.js');
const { join, parse } = require('path');
const Settings = require('./Settings');
const Sequelize = require('sequelize');
const fs = require('fs');

class Client extends _Client {
	constructor(options = {}) {
		super({
			db: null,
			disableEveryone: true,
			disabledEvents: ['TYPING_START'],
			ws: { compress: true },
			...options,
		});

		const o = options.owner || options.owners;
		this.icon = options.icon;
		this.color = options.color;
		this.prefix = options.prefix;
		this.invite = options.invite;
		this.logging = options.logging;
		this.inhibitor = options.inhibitor;
		this.permissions = options.permissions === undefined ? 8 : options.permissions;
		this.owners = Array.isArray(o) ? o : [o];
		this.events = new Collection();
		this.commands = new Collection();
		if (options.db) {
			if (typeof options.db === 'string') options.db = { storage: options.db };
			this.db = new Sequelize({
				dialect: 'sqlite',
				logging: false,
				operatorsAliases: false,
				...options.db,
			});
			this.settings = new Settings(this.db);
			this.db.sync();
		}

		this.addCommands(join(__dirname, 'commands'));

		this.on('message', this.onMessage);
		this.on('messageUpdate', this.onMessageUpdate);
	}

	isOwner(id) {
		return this.owners.includes(id);
	}

	findCommand(name) {
		return this.commands.get(name) || this.commands.find(command => command.options.aliases.includes(name));
	}

	addEvents(directory) {
		const files = fs.readdirSync(directory);
		for (const file of files) {
			if (fs.statSync(join(directory, file)).isDirectory()) continue;
			const { name } = parse(file);
			const Evt = require(join(directory, file)); // eslint-disable-line global-require
			const event = new Evt(this);
			this.events.set(name, event);
			this.on(name, async (...args) => {
				try {
					await event.run(...args);
				} catch (error) {
					console.log('Error!');
					console.log(`Event: ${name}`);
					console.error(error);
				}
			});
		}

		return this;
	}

	addCommands(directory) {
		const folders = fs.readdirSync(directory);
		for (const folder of folders) {
			const files = fs.readdirSync(join(directory, folder));
			for (const file of files) {
				if (fs.statSync(join(directory, folder, file)).isDirectory()) continue;
				const { name } = parse(file);
				const Cmd = require(join(directory, folder, file)); // eslint-disable-line global-require
				const command = new Cmd();
				command.options.name = command.options.name || name;
				command.options.group = command.options.group || folder;
				const { aliases, name: n } = command.options;
				if (n.includes('-') && !aliases.includes(n.replace(/-/g, '')))
					aliases.push(n.replace(/-/g, ''));
				for (const alias of aliases)
					if (!aliases.includes(alias.replace(/-/g, '')))
						aliases.push(alias.replace(/-/g, ''));
				command.client = this;
				this.commands.set(n, command);
			}
		}

		return this;
	}

	onMessageUpdate(_, msg) {
		this.onMessage(msg);
	}

	async onMessage(msg) {
		if (msg.author.bot) return;

		const guild = msg.channel.type === 'text';
		const mention = msg.content.startsWith(`<@${guild && msg.guild.me.nickname ? '!' : ''}${this.user.id}>`);
		const p = (guild && this.settings ? this.settings.get(msg.guild.id, 'prefix') : null) || this.prefix;
		if (!mention && (p === 'none' || !msg.content.startsWith(p)) && guild) return;
		if (guild && !msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')) return;
		if (this.inhibitor && !this.inhibitor(msg)) return;
		const args = msg.content
			.slice(
				mention
					? this.user.id.length + (msg.content.startsWith('<@!') ? 4 : 3)
					: msg.content.startsWith(p)
						? p.length
						: 0
			)
			.trim()
			.split(' ');
		const command = this.findCommand(args.shift().toLowerCase());
		if (!command) return;
		try {
			if (guild && !msg.member) msg.member = await msg.guild.members.fetch(msg.author.id);
		} catch (_) {
			return msg.channel.send('Something bad happened.');
		}
		const { options } = command;
		const owner = this.isOwner(msg.author.id);
		if (!owner) {
			if (options.ownerOnly)
				return msg.channel.send('Only my owner can use this command!');
			if (options.disabled)
				return msg.channel.send('This command is temporarily disabled. Check back soon!');
		}
		if ((options.guildOnly || options.memberPerms || options.clientPerms) && !guild)
			return msg.channel.send('This command only works in servers!');
		if (options.memberPerms && !msg.member.hasPermission(options.memberPerms) && !owner)
			return msg.channel.send('You aren\'t permitted to use this command!');
		if (options.clientPerms && !msg.guild.me.hasPermission(options.clientPerms))
			return msg.channel.send('I don\'t have the permissions to run this command!');
		msg.prefix = guild && this.settings && this.settings.get(msg.guild.id, 'prefix') === 'none' ? `@${this.user.username} ` : p;
		msg.owner = owner;
		if (mention) {
			if (msg.mentions.users.size > 1) msg.mentions.users.delete(this.user.id);
			if (msg.mentions.members.size > 1) msg.mentions.members.delete(this.user.id);
		}
		try {
			const valid = await command.run(msg, args);
			if (valid === false) return msg.channel.send(`Invalid usage! Please do \`${msg.prefix}${options.name} ${options.usage}\``);
		} catch (error) {
			if (error.code === APIErrors.CANNOT_MESSAGE_USER && guild)
				return msg.channel.send('I can\'t DM you, make sure you have "Allow direct messages from server members." turned on in your "Privacy & Safety" settings.');
			msg.channel.send([
				'An error occurred while I tried to execute this command.',
				'My owner has been notified and will see what he can do about it!',
			]);
			if (this.logging === false) return;
			if (this.logging) {
				const channel = this.channels.get(this.logging);
				if (!channel) return console.log('Couldn\'t find channel to log to. Make sure the ID is correct.');
				const embed = command.embed
					.addField(command.title('Info'), command.list(`
						Command: ${command.options.name}
						${guild ? 'Guild' : 'User'}: ${guild ? `${msg.guild.name} (${msg.guild.id})` : msg.author.tag}
					`))
					.addField(command.title('Error'), command.code(command.trim(error.stack, 1000), 'js'))
					.setColor(0xFF3232)
					.setTimestamp();
				try {
					await channel.send(embed);
				} catch (err) {
					console.log('Tried to send message to logging channel, but couldn\'t!');
					console.error(err);
				}
			} else {
				console.log('Error!');
				console.log(`Command: ${options.name}`);
				console.log(guild ? `Guild: ${msg.guild.name} (${msg.guild.id})` : `DM: ${msg.author.tag}`);
				console.error(error);
			}
		}
	}
}

module.exports = Client;