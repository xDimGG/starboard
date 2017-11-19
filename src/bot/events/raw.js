const { MessageEmbed } = require('discord.js');
const getChannel = require('../utils/channel');
const { site } = require('../../../config');
const extract = require('image-extractor');
const info = require('../utils/info');
const formats = ['webp', 'png', 'jpg', 'gif'];
const star = '⭐';

exports.run = async (raw, { client, settings, starboard }) => {
	if (!['MESSAGE_UPDATE', 'MESSAGE_DELETE', 'MESSAGE_DELETE_BULK', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(raw.t)) return;
	if (['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(raw.t) && raw.d.emoji.name !== star) return;
	const channel = client.channels.get(raw.d.channel_id);
	if (!channel || channel.type !== 'text') return;
	const blacklisted = settings.get(channel.guild.id, 'blacklist');
	if (blacklisted && blacklisted.split('|').includes(channel.id)) return;
	const sb = getChannel(channel.guild);
	if (!sb) return;
	if (['MESSAGE_DELETE', 'MESSAGE_DELETE_BULK'].includes(raw.t)) {
		if (raw.t === 'MESSAGE_DELETE') {
			const info = await starboard.get(raw.d.id);
			if (!info) return;
			const sent = await channel.get(info.message_sent);
			if (!sent) return;
			await sent.delete();
			await starboard.delete(raw.d.id);
			client.emit('star');
		} else {
			for (const id of raw.d.ids) {
				const info = await starboard.get(id);
				if (!info) continue;
				const sent = await channel.get(info.message_sent);
				if (!sent) continue;
				await sent.delete();
				await starboard.delete(id);
				client.emit('star');
			}
		}
		return;
	}
	if (['MESSAGE_UPDATE', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(raw.t)) {
    const msg = await channel.messages.fetch(raw.d.id || raw.d.message_id);
		if (!msg || msg.author.id === client.user.id) return;
		if (msg.author.id === raw.d.user_id) {
			if (raw.t === 'MESSAGE_REACTION_ADD') return msg.reply('you can\'t star your own messages.');
			return;
		}
		const prev = await starboard.get(raw.d.id || raw.d.message_id);
		const count = msg.reactions.get(star) ? msg.reactions.get(star).count - (msg.reactions.get(star).users.has(msg.author.id) ? 1 : 0) : 0;
		const minimum = settings.get(msg.guild.id, 'minimum');
		if (count >= minimum) {
			const { color, emoji } = info(count);
			const minimal = settings.get(msg.guild.id, 'minimal') === '1';
			const embed = new MessageEmbed()
				.setAuthor(`${msg.author.tag}${minimal ? '' : ` (${msg.author.id})`} in #${msg.channel.name}`, `${msg.author.displayAvatarURL({ format: 'png' })}?size=20`, `${site}/${msg.guild.id}/${msg.id}`)
				.setColor(color)
        .setFooter(`${emoji} ${count} Star${count === 1 ? '' : 's'}`);
      if (!minimal) embed.setTimestamp(msg.createdAt);
			if (msg.content) embed.setDescription(msg.content);
			if (prev) {
				const prevMsg = await sb.messages.fetch(prev.message_sent);
				prevMsg.edit(embed);
				starboard.update(msg, count);
				client.emit('starCount');
			} else {
        console.log(`New starred message in ${msg.guild.name} (${msg.guild.id})`);
				if (msg.attachments.size) {
					const file = msg.attachments.first().file;
					if (formats.some(format => file.name.toLowerCase().endsWith(`.${format}`))) embed.setImage(file.attachment);
					else embed.attachFiles({ attachment: file.attachment, name: file.name });
				} else {
					const match = msg.content.match(/https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)/);
					const match2 = msg.content.match(/https?:\/\/.*\b/g);
					if (match) return embed.setImage(match[0]);
					if (match2) {
						for (const m of match2) {
							const img = await extract(m);
							if (img) {
								embed.setImage(img);
								break;
							}
						}
					}
				}
				const sent = await sb.send(embed);
				await starboard.create(msg, count, sent.id);
				client.emit('star');
				client.emit('starCount');
			}
		} else if (prev) {
			const prevMsg = await sb.messages.fetch(prev.message_sent);
			if (prevMsg) await prevMsg.delete();
			await starboard.delete(raw.d.message_id);
			client.emit('star');
			client.emit('starCount');
		}
	}
};