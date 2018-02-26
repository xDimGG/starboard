const pad = c => `${'{'.repeat(1000)}${c}${'}'.repeat(1000)}`;
const clean = str => str.replace(/[&<>"]/g, c => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
}[c]));
const reg = {
	link: /https?:\/\/(\w{1,63}\.){1,128}\w{2,63}([/?#]\S+)?/g,
	emoji: /&lt;(a)?:(\w{2,32}):(\d{17,19})&gt;/g,
	escape: str => str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'),
};
const md = {
	__: 'u',
	_: 'em',
	'~~': 's',
	'**': 'strong',
	'*': 'em',
	'```': 'pre',
	'``': 'code',
	'`': 'code',
};

module.exports = (text, guild, client) => {
	const links = [];

	text = text.replace(reg.link, link => {
		links.push(link);

		return pad('L');
	});

	text = clean(text);

	for (const m of Object.keys(md)) {
		const f = m.split('').map(i => `(?!\\\\)${reg.escape(i)}`).join('');
		const r = new RegExp(`${f}([\\S\\s]+?)${f}`);
		text = text.replace(r, `<${md[m]}>$1</${md[m]}>`);
	}

	text = text
		.replace(/&lt;@!?(\d{17,19})&gt;/g, (_, id) => {
			let name;
			if (guild.members.has(id))
				name = `@${guild.members.get(id).displayName}`;
			else if (client.users.has(id))
				name = `@${client.users.get(id).username}`;
			else
				name = `<@${id}>`;

			return `<a class="mention" href="/user/${id}">${name}</a>`;
		})
		.replace(/&lt;#(\d{17,19})&gt;/g, (_, id) => {
			if (guild.channels.has(id))
				return `<a class="mention" href="/server/${id}">#${guild.channels.get(id).name}</a>`;

			return '#deleted-channel';
		})
		.replace(/&lt;@&amp;(\d{17,19})&gt;/g, (_, id) => {
			if (guild.roles.has(id)) {
				const role = guild.roles.get(id);

				return `<span class="mention" color="${role.hexColor.toUpperCase()}">@${role.name}</span>`;
			}

			return '@deleted-role';
		})
		.replace(reg.emoji, (_, animated, name, id) => `<img title="${name}" src="${client.rest.cdn.Emoji(id, animated ? 'gif' : 'png')}">`)
		.replace(/@(everyone|here)/g, '<span class="mention">$1</span>');

	while (links.length) {
		const link = clean(links.shift());
		text = text.replace(pad('L'), `<a href="${link}" target="_blank">${link}</a>`);
	}

	text = text.replace(/\n/g, '<br>');

	return text;
};