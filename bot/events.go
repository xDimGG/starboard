package bot

import (
	"github.com/go-pg/pg"

	"github.com/xdimgg/starboard/bot/tables"

	"github.com/bwmarrin/discordgo"
	"github.com/xdimgg/starboard/bot/util"
)

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
				"content": m.Content,
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

	if m.EditedTimestamp != "" {
		_, err = b.PG.Model(&tables.Message{
			ID:      m.ID,
			Content: m.Content,
			Image:   util.GetImage(m.Message),
		}).WherePK().UpdateNotNull()
	} else if image := util.GetImage(m.Message); image != "" {
		_, err = b.PG.Model(&tables.Message{
			ID:    m.ID,
			Image: image,
		}).WherePK().UpdateNotNull()
	} else {
		return
	}

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

	if err != pg.ErrNoRows {
		err = b.updateMessage(s, m.MessageID, m.ChannelID, m.GuildID)
		if err != nil {
			b.Sentry.CaptureError(err, map[string]string{"event": "MESSAGE_REACTION_REMOVE"})
			return
		}
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
