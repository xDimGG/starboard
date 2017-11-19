const emojis = require('./emojis.json');
const sanitize = require('./sanitize');
const reg = require('url-regex');
const long = i => `${'{'.repeat(1000)}${i}${'}'.repeat(1000)}`;

module.exports = text => {
	const urls = text.match(reg());
	const us = [];
	for (const i in urls) {
		us.push(sanitize(urls[i]));
		text = text.replace(urls[i], long(`U${i}`));
	}
	const customs = text.match(/<:[A-Za-z0-9_]{1,32}:\d+>/g);
	const cs = [];
	for (const i in customs) {
		cs.push({
			img: customs[i].replace(/<:[A-Za-z0-9_]{1,32}:(\d+)>/, '$1'),
			title: customs[i].replace(/<:([A-Za-z0-9_]{1,32}):(\d+)>/, '$1')
		});
		text = text.replace(customs[i], long(`C${i}`));
	}
	text = sanitize(text);
	text = text
		.replace(/:[A-Za-z0-9_]{1,32}:/g, name => {
			const e = emojis.find(e => e.names.includes(name.slice(1, -1)));
			return e ? e.surrogates : name;
		})
		.replace(/(?!\\)```\w+\n(.*?|\s*?)```/g, '<pre>$1</pre>')
		.replace(/(?!\\)``(.*?|\s*?)``/g, '<code>$1</code>')
		.replace(/(?!\\)`(.*?|\s*?)`/g, '<code>$1</code>')
		.replace(/(?!\\)\*\*(.*?|\s*?)\*\*/g, '<strong>$1</strong>')
		.replace(/(?!\\)\*(.*?|\s*?)\*/g, '<em>$1</em>')
		.replace(/(?!\\)__(.*?|\s*?)__/g, '<u>$1</u>')
		.replace(/(?!\\)_(.*?|\s*?)_/g, '<em>$1</em>')
		.replace(/(?!\\)~~(.*?|\s*?)~~/g, '<s>$1</s>')
		.replace(/&lt;@!?[0-9]+&gt;/g, '<mention>@someone</mention>')
		.replace(/@(everyone|here)/g, '<mention>@$1</mention>')
		.replace(/&lt;@&amp;[0-9]+&gt;/g, '<mention>@role</mention>')
		.replace(/&lt;#[0-9]+&gt;/g, '<mention>#channel</mention>');
	for (const i in us) {
		text = text.replace(long(`U${i}`), `<a href="${us[i]}" target="_blank">${us[i]}</a>`);
	}
	for (const i in cs) {
		text = text.replace(long(`C${i}`), `<img src="https://cdn.discordapp.com/emojis/${cs[i].img}.png" alt=":${cs[i].title}:" title="${cs[i].title}">`);
	}
	text = text.replace(/\n+/g, '<br>');
	return text;
};