package commandler

import (
	"fmt"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/xdimgg/starboard/bot/util"
)

// MessageCreate handles the message create event
func (c *Commandler) MessageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	if m.Author.Bot {
		return
	}

	prefix, hasPrefix := c.ParsePrefix(m.Message)
	if !hasPrefix {
		return
	}

	splitContent := strings.Split(strings.TrimSpace(m.Content[len(prefix):]), " ")
	command := strings.ToLower(splitContent[0])
	if command == "" {
		return
	}

	cmd := c.FindCommand(command)
	if cmd == nil {
		return
	}

	lang := c.settings.GetString(m.GuildID, "language")
	l := c.locales.Language(lang)

	if cmd.GuildOnly && m.GuildID == "" {
		s.ChannelMessageSend(m.ChannelID, l("restrictions.guild_only"))
		return
	}

	if cmd.OwnerOnly && m.Author.ID != c.OwnerID {
		s.ChannelMessageSend(m.ChannelID, l("restrictions.owner_only"))
		return
	}

	if m.GuildID != "" {
		myPerms, err := s.State.UserChannelPermissions(s.State.User.ID, m.ChannelID)
		if err != nil || myPerms&discordgo.PermissionSendMessages != discordgo.PermissionSendMessages {
			return
		}

		if cmd.ClientPerms != 0 && myPerms&cmd.ClientPerms != cmd.ClientPerms {
			s.ChannelMessageSend(m.ChannelID, l("restrictions.permissions.missing.client", util.GetMissing(myPerms, cmd.ClientPerms, l)))
			return
		}

		if cmd.MemberPerms != 0 {
			memberPerms, err := s.State.UserChannelPermissions(m.Author.ID, m.ChannelID)
			if err != nil {
				s.ChannelMessageSend(m.ChannelID, l("restrictions.permissions.missing.member.error"))
				return
			}

			if memberPerms&cmd.MemberPerms != cmd.MemberPerms {
				s.ChannelMessageSend(m.ChannelID, l("restrictions.permissions.missing.member", util.GetMissing(memberPerms, cmd.MemberPerms, l)))
				return
			}
		}
	}

	ctx := &Context{
		Args:       splitContent[1:],
		Message:    m.Message,
		Session:    s,
		Command:    cmd,
		Commandler: c,
		Prefix:     prefix,
		Locale:     l,
		Language:   lang,
	}

	defer func() {
		err := recover()

		switch err.(type) {
		case nil:
			return
		case error:
			c.onError(ctx, err.(error), true)
		default:
			c.onError(ctx, fmt.Errorf("%v", err), true)
		}
	}()

	err := cmd.Run(ctx)
	if err != nil {
		c.onError(ctx, err, false)
	}
}
