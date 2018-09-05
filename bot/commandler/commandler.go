package commandler

import (
	"regexp"
	"strings"
	"sync"

	"github.com/xdimgg/starboard/bot/localization"

	"github.com/bwmarrin/discordgo"
	"github.com/xdimgg/starboard/bot/util"
)

// Commandler represents a command handler
type Commandler struct {
	Commands   []*Command
	OwnerID    string
	commandMap map[string]*Command
	onError    func(*Context, error, bool)
	mu         *sync.Mutex
	settings   Settings
	locales    *localization.Locales
	reMention  *regexp.Regexp
}

// Settings interface
type Settings interface {
	GetString(string, string) string
}

// New creates a new commandler instance
func New(s *discordgo.Session, locales *localization.Locales, settings Settings) *Commandler {
	c := &Commandler{
		Commands:   make([]*Command, 0),
		commandMap: make(map[string]*Command),
		mu:         &sync.Mutex{},
		settings:   settings,
		locales:    locales,
		reMention:  regexp.MustCompile("^<@!?" + util.ParseID(s.Token) + ">"),
	}

	s.AddHandler(c.MessageCreate)

	return c
}

// SetOnError sets an onError function
func (c *Commandler) SetOnError(fn func(*Context, error, bool)) {
	c.onError = fn
}

// AddCommand validates and adds a command to the commands map
func (c *Commandler) AddCommand(cmd *Command) {
	if cmd.Name == "" {
		panic("Command.Name must be set")
	}

	if cmd.Run == nil {
		panic("Command.Run must be set")
	}

	for _, alias := range cmd.Aliases {
		c.commandMap[alias] = cmd
	}

	if c.locales != nil {
		for _, asset := range c.locales.Assets {
			aliases := asset.Translation("commands." + cmd.Name + ".aliases")
			name := asset.Translation("commands." + cmd.Name + ".name")

			if aliases != nil {
				for _, alias := range aliases.([]interface{}) {
					c.commandMap[alias.(string)] = cmd
				}
			}

			if name != nil {
				c.commandMap[name.(string)] = cmd
			}
		}
	}

	c.commandMap[cmd.Name] = cmd
	c.Commands = append(c.Commands, cmd)
}

// FindCommand finds a command by searching for it by its names or aliases
func (c *Commandler) FindCommand(name string) *Command {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.commandMap[name]
}

// ParsePrefix extracts the prefix of a message and returns false if no prefix was found
func (c *Commandler) ParsePrefix(m *discordgo.Message) (string, bool) {
	if c.settings != nil {
		guildPrefix := c.settings.GetString(m.GuildID, "prefix")
		if guildPrefix != "" && strings.HasPrefix(strings.ToLower(m.Content), strings.ToLower(guildPrefix)) {
			return guildPrefix, true
		}
	}

	match := c.reMention.FindString(m.Content)
	if match != "" {
		return match, true
	}

	return "", m.GuildID == ""
}
