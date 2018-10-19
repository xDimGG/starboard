# Localization Guide
If you're planning on writing translations, there are just a couple of things to know

### Don't include the following command(s) (since only the owner can use them)
- reload-locales

### How to localize lists properly
The 4 fields related to lists are in the following format:
```json
	"list.or.prefix": "either ",
	"list.or.double": "%s or %s",
	"list.or.seperator": ", ",
	"list.or.final_seperator": ", or ",
```

The pseudocode for generating lists is as follows (assuming `items` is a string array and `locale` is a function that gets the locale definition of the provided key and executes C style string formatting using the provided arguments):
```py
def locale_list(items):
	if len(items) == 1:
		return items[0]

	result = locale('list.or.prefix')

	if len(items) == 2:
		return result + locale('list.or.double', items[0], items[1])

	for index, item in enumerate(items):
		result += item

		if index == len(items) - 1: pass # Ignore last item
		elif index == len(items) - 2: result += locale('list.or.final_seperator') # Insert final seperator at second to last item
		else: result += locale('list.or.seperator') # Insert seperator at every other item

	return result
```

### How `settings.to_key.*` works
Whenever a user runs the settings command like so: `@Starboard settings asdf`, the program will attempt to look at the value for `settings.to_key.asdf` to know which setting the user is referring to.