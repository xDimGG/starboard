class Util {
	static paginate(array, offset = 0, limit = 10) {
		if (array.length === 0)
			throw 'There are no pages to display!'; // eslint-disable-line no-throw-literal

		if (offset < 0)
			throw 'The page can\'t be less than one!'; // eslint-disable-line no-throw-literal

		const pages = Math.ceil(array.length / limit);

		if (offset > pages)
			throw `There ${pages === 1 ? 'is' : 'are'} only ${pages} page${pages === 1 ? '' : 's'}!`; // eslint-disable-line no-throw-literal

		return {
			footer: `Page ${offset + 1} of ${pages}`,
			data: array.slice(offset * limit, (offset + 1) * limit),
		};
	}

	static integer(integer, fallback = 1) {
		const floored = Math.floor(Number(integer));

		return (isNaN(floored) ? fallback : floored) - 1;
	}

	static trim(string, length) {
		return string.length - 1 > length ? `${string.slice(0, length)}${length >= string.length ? '' : '…'}` : string;
	}

	static table(array) {
		const maxes = array[0].map((_, i) => Math.max(...array.map(el => `${el[i]}`.length)));

		return array.map(row => row.map((column, i) => `${column}`.padEnd(maxes[i])).join(' | '));
	}

	static grid(array, width = 5) {
		return Array.from({ length: Math.ceil(array.length / width) }, (_, i) => array.slice(i++ * width, i * width));
	}

	static title(string) {
		return `❯ ${string}`;
	}

	static list(array) {
		if (typeof array === 'string')
			array = array
				.trim()
				.split('\n');

		return array
			.map(line => line.trim() ? `• ${line.trim()}` : '')
			.join('\n');
	}

	static code(string, language = '') {
		return `\`\`\`${language}\n${string}\n\`\`\``;
	}
}

module.exports = Util;