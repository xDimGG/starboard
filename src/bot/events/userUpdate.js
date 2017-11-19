exports.run = (old, user, { starboard }) => {
	const oldPic = old.avatar;
	const newPic = user.avatar;
	if (oldPic !== newPic) {
		starboard.db.run('UPDATE messages SET author_icon = (?) WHERE author_icon = (?)', newPic, oldPic);
	}
};