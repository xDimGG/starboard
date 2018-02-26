exports.run = (data, client) => client.starboard.db.update({ server_name: data.name }, { where: { server_id: data.id } });

/**
{
	widget_enabled: false,
	widget_channel_id: null,
	verification_level: 0,
	system_channel_id: '396071913866264579',
	splash: null,
	roles: [
		{
			position: 0,
			permissions: 104324169,
			name: '@everyone',
			mentionable: false,
			managed: false,
			id: '396071913866264576',
			hoist: false,
			color: 0
		}
	],
	region: 'us-east',
	owner_id: '170336523772755968',
	name: 'Starboard 2.00',
	mfa_level: 0,
	id: '396071913866264576',
	icon: '38626fa262f3bb146336e0eb439b695b',
	features: [],
	explicit_content_filter: 0,
	emojis: [],
	embed_enabled: false,
	embed_channel_id: null,
	default_message_notifications: 1,
	application_id: null,
	afk_timeout: 300,
	afk_channel_id: null
}
*/