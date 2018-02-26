const ranks = [
	[100, '🌌', 0x6F29CE],
	[50, '💫', 0xFFB549],
	[10, '🌟', 0xFFB13F],
	[0, '⭐', 0xFFAC33],
];

module.exports = stars => {
	for (const [star, emoji, color] of ranks)
		if (star <= stars) return { color, emoji };
};