module.exports = message => {
	const attachment = message.attachments.first();
	if (attachment && attachment.width) return attachment.url;
	const [embed] = message.embeds;
	if (embed) {
		if (embed.image && embed.image.width) return embed.image.url;
		if (embed.thumbnail && embed.thumbnail.width) return embed.thumbnail.url;
	}
};