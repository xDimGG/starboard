class Starboard {
	constructor(db) {
		this.db = db;
		this.db.run(`
		CREATE TABLE IF NOT EXISTS messages (
			author_tag TEXT,
			author_id TINYTEXT,
			author_icon TEXT,

			server_id TINYTEXT,
			server_name TINYTEXT,

			channel_id TINYTEXT,
			channel_name TINYTEXT,

			message_id TINYTEXT,
			message_file TEXT,
			message_content TEXT,
			message_created TEXT,
			message_sent TINYTEXT,
			message_stars INT
		)
		`);
	}

	async get(id) {
		return await this.db.get('SELECT * FROM messages WHERE message_id = (?)', id);
	}

	async delete(id) {
		return await this.db.run('DELETE FROM messages WHERE message_id = (?)', id);
	}

	async deleteAll(id) {
		return await this.db.run('DELETE FROM messages WHERE server_id = (?)', id);
	}

	async create(msg, count, sent) {
		return await this.db.run(`
		INSERT INTO messages (
			author_tag,
			author_id,
			author_icon,
			server_id,
			server_name,
			channel_id,
			channel_name,
			message_id,
			message_file,
			message_sent,
			message_stars,
			message_content,
			message_created
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			msg.author.tag,
			msg.author.id,
			msg.author.avatar,
			msg.guild.id,
			msg.guild.name,
			msg.channel.id,
			msg.channel.name,
			msg.id,
			msg.attachments.first() ? msg.attachments.first().file.attachment : null,
			sent,
			count,
			msg.content,
			msg.createdAt.toISOString()
		);
	}

	async update(msg, count) {
		return await this.db.run(`
		UPDATE messages SET
			author_tag = (?),
			author_icon = (?),
			server_name = (?),
			channel_name = (?),
			message_stars = (?),
			message_content = (?)
		WHERE message_id = (?)`,
			msg.author.tag,
			msg.author.avatar,
			msg.guild.name,
			msg.channel.name,
			count,
			msg.content
		);
	}
}

module.exports = Starboard;