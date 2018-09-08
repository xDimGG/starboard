package bot

import (
	"time"

	"github.com/go-pg/pg"

	"github.com/xdimgg/starboard/bot/tables"

	"github.com/bwmarrin/discordgo"
	"github.com/xdimgg/starboard/bot/util"
)

func getIconURL(g *discordgo.Guild) string {
	if g.Icon == "" {
		return ""
	}

	return discordgo.EndpointGuildIcon(g.ID, g.Icon)
}

func (b *Bot) ready(s *discordgo.Session, r *discordgo.Ready) {
	b.expectedGuilds[s] = len(r.Guilds)
	s.UpdateStatus(0, "@"+r.User.Username+" help")
}

func (b *Bot) guildCreate(s *discordgo.Session, g *discordgo.GuildCreate) {
	if b.expectedGuilds[s] != 0 {
		b.expectedGuilds[s]--
		return
	}

	s.ChannelMessageSendEmbed(b.opts.GuildLogChannel, &discordgo.MessageEmbed{
		Author: &discordgo.MessageEmbedAuthor{
			Name:    g.Name + " (" + g.ID + ")",
			IconURL: getIconURL(g.Guild),
		},
		Color:     0x5BFF5B,
		Footer:    &discordgo.MessageEmbedFooter{Text: "Joined"},
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

func (b *Bot) guildDelete(s *discordgo.Session, g *discordgo.GuildDelete) {
	s.ChannelMessageSendEmbed(b.opts.GuildLogChannel, &discordgo.MessageEmbed{
		Author: &discordgo.MessageEmbedAuthor{
			Name:    g.Name + " (" + g.ID + ")",
			IconURL: getIconURL(g.Guild),
		},
		Color:     0xFF3838,
		Footer:    &discordgo.MessageEmbedFooter{Text: "Left"},
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

func (b *Bot) guildMemberAdd(s *discordgo.Session, m *discordgo.GuildMemberAdd) {
	if m.GuildID != b.opts.Guild {
		return
	}

	s.ChannelMessageSendEmbed(b.opts.MemberLogChannel, &discordgo.MessageEmbed{
		Author: &discordgo.MessageEmbedAuthor{
			Name:    m.User.Username + " (" + m.User.ID + ")",
			IconURL: m.User.AvatarURL(""),
		},
		Color:     0x5BFF5B,
		Footer:    &discordgo.MessageEmbedFooter{Text: "Joined"},
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

func (b *Bot) guildMemberRemove(s *discordgo.Session, m *discordgo.GuildMemberRemove) {
	if m.GuildID != b.opts.Guild {
		return
	}

	s.ChannelMessageSendEmbed(b.opts.MemberLogChannel, &discordgo.MessageEmbed{
		Author: &discordgo.MessageEmbedAuthor{
			Name:    m.User.Username + " (" + m.User.ID + ")",
			IconURL: m.User.AvatarURL(""),
		},
		Color:     0xFF3838,
		Footer:    &discordgo.MessageEmbedFooter{Text: "Left"},
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

func (b *Bot) messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	if m.GuildID == "" {
		return
	}

	err := b.cacheMessage(m.Message)
	if err != nil {
		b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_CREATE"})
	}
}

func (b *Bot) messageUpdate(s *discordgo.Session, m *discordgo.MessageUpdate) {
	if m.GuildID == "" {
		return
	}

	key := "messages:" + m.ID

	if b.Redis.Exists(key).Val() == 1 {
		var err error

		if m.EditedTimestamp != "" {
			err = b.Redis.HMSet(key, map[string]interface{}{
				"content": util.GetContent(m.Message),
				"image":   util.GetImage(m.Message),
			}).Err()
		} else if image := util.GetImage(m.Message); image != "" {
			err = b.Redis.HSet(key, "image", image).Err()
		} else {
			return
		}

		if err != nil {
			b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_UPDATE"})
			return
		}

		err = b.Redis.Expire(key, expiryTime).Err()
		if err != nil {
			b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_UPDATE"})
			return
		}
	}

	var err error

	image := util.GetImage(m.Message)

	q := b.PG.
		Model((*tables.Message)(nil)).
		Where("id = ?", m.ID)

	if m.EditedTimestamp != "" {
		q = q.Set("content = ?", m.Content).Set("image = ?", image)
	} else if image != "" {
		q = q.Set("image = ?", image)
	} else {
		return
	}

	_, err = q.Update()
	if err != nil {
		b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_UPDATE"})
		return
	}

	err = b.updateMessage(s, m.ID, m.ChannelID, m.GuildID)
	if err != nil {
		b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_UPDATE"})
		return
	}
}

func (b *Bot) messageDelete(s *discordgo.Session, m *discordgo.MessageDelete) {
	if m.GuildID == "" {
		return
	}

	if b.Settings.GetBool(m.GuildID, settingSaveDeletedMessages) {
		return
	}

	msg := &tables.Message{ID: m.ID}
	err := b.PG.Select(msg)
	if err != nil {
		if err != pg.ErrNoRows {
			b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_UPDATE"})
		}
		return
	}

	starboard := b.getStarboard(s, msg)
	if starboard == settingNone {
		return
	}

	go s.ChannelMessageDelete(starboard, msg.SentID)
	go b.PG.Delete(msg)
}

func (b *Bot) messageDeleteBulk(s *discordgo.Session, m *discordgo.MessageDeleteBulk) {
	if m.GuildID == "" {
		return
	}

	if b.Settings.GetBool(m.GuildID, settingSaveDeletedMessages) {
		return
	}

	args := make([]interface{}, len(m.Messages))

	for i, id := range m.Messages {
		args[i] = id
	}

	var rows []tables.Message
	err := b.PG.Model(&rows).WhereIn("id IN (?)", args...).Returning("sent_id").Select()
	if err != nil {
		if err != pg.ErrNoRows {
			b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_UPDATE"})
		}
		return
	}

	msg := &tables.Message{
		ChannelID: m.ChannelID,
		GuildID:   m.GuildID,
	}

	starboard := b.getStarboard(s, msg)
	if starboard == settingNone {
		return
	}

	messages := make([]string, len(rows))

	for i, row := range rows {
		messages[i] = row.SentID
	}

	go s.ChannelMessagesBulkDelete(starboard, messages)
	go b.PG.Model((*tables.Message)(nil)).WhereIn("id IN (?)", args...).Delete()
}

func (b *Bot) messageReactionAdd(s *discordgo.Session, m *discordgo.MessageReactionAdd) {
	if m.GuildID == "" {
		return
	}

	emoji := b.Settings.GetEmoji(m.GuildID, settingEmoji)

	if m.Emoji.ID == "" {
		if m.Emoji.Name != emoji.Unicode {
			return
		}
	} else if m.Emoji.ID != emoji.ID {
		return
	}

	member, err := s.State.Member(m.GuildID, m.UserID)
	perms, _ := s.State.UserChannelPermissions(m.UserID, m.ChannelID)
	mm := perms&discordgo.PermissionManageMessages != 0
	bot := false

	if err == nil {
		if member.User.Bot {
			bot = true

			if mm && b.Settings.GetBool(m.GuildID, settingRemoveBotStars) {
				err = s.MessageReactionRemove(m.ChannelID, m.MessageID, m.Emoji.APIName(), m.UserID)
				if err == nil {
					return
				}
			}
		}
	}

	err = b.PG.Insert(&tables.Reaction{
		Bot:       bot,
		UserID:    m.UserID,
		MessageID: m.MessageID,
	})
	if err != nil {
		b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_REACTION_ADD"})
		return
	}

	err = b.updateMessage(s, m.MessageID, m.ChannelID, m.GuildID)
	if err != nil {
		b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_REACTION_ADD"})
		return
	}
}

func (b *Bot) messageReactionRemove(s *discordgo.Session, m *discordgo.MessageReactionRemove) {
	if m.GuildID == "" {
		return
	}

	emoji := b.Settings.GetEmoji(m.GuildID, settingEmoji)

	if m.Emoji.ID == "" {
		if m.Emoji.Name != emoji.Unicode {
			return
		}
	} else if m.Emoji.ID != emoji.ID {
		return
	}

	err := b.PG.Delete(&tables.Reaction{
		UserID:    m.UserID,
		MessageID: m.MessageID,
	})
	if err != nil && err != pg.ErrNoRows {
		b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_REACTION_REMOVE"})
		return
	}

	err = b.updateMessage(s, m.MessageID, m.ChannelID, m.GuildID)
	if err != nil {
		if e, ok := err.(pg.Error); ok && e.IntegrityViolation() {
			return
		}

		b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_REACTION_REMOVE"})
		return
	}
}

func (b *Bot) messageReactionRemoveAll(s *discordgo.Session, m *discordgo.MessageReactionRemoveAll) {
	if m.GuildID == "" {
		return
	}

	msg := &tables.Message{ID: m.MessageID}
	err := b.PG.Select(msg)
	if err != nil {
		if err != pg.ErrNoRows {
			b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_UPDATE"})
		}
		return
	}

	starboard := b.getStarboard(s, msg)
	if starboard == settingNone {
		return
	}

	go s.ChannelMessageDelete(starboard, msg.SentID)
	go b.PG.Delete(msg)
}
