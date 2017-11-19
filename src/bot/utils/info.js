module.exports = count => count >= 500
	? { color: 0xFFFFFF, emoji: '🌌' }
	: count >= 100
		? { color: 0x7A15C0, emoji: '🌠' }
		: count >= 10
				? { color: 0x9569b5, emoji: '🌟' }
				: { color: 0xFFAC33, emoji: '⭐' };