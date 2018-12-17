package bot

import (
	"math/rand"
	"strconv"
	"time"

	"github.com/xdimgg/starboard/bot/util"

	"github.com/bwmarrin/discordgo"
	"github.com/go-pg/pg"
	"github.com/jinzhu/inflection"
	"github.com/xdimgg/starboard/bot/tables"
)

const expiryTime = time.Minute * 20
const gray = 0x2E3036

var styles = [...]struct{ max, color int }{
	{100, 0x6F29CE},
	{50, 0xFFB549},
	{10, 0xFFB13F},
	{0, 0xFFAC33},
}

func init() {
	rand.Seed(time.Now().UnixNano())
}

func (b *Bot) getStarboard(s *discordgo.Session, channelID, guildID string) (starboard string) {
	setting := settingChannel
	c, err := s.State.Channel(channelID)
	if err != nil || c.NSFW {
		setting = settingNSFWChannel
	}

	starboard = b.Settings.GetString(guildID, setting)
	if starboard == settingNone {
		g, err := s.State.Guild(guildID)
		if err != nil {
			return
		}

		ch := findDefaultChannel(setting, s.State, g)
		if ch == nil {
			return
		}

		starboard = ch.ID
	}

	if starboard == "" {
		starboard = settingNone
	}

	return
}

func (b *Bot) generateEmbed(msg *tables.Message, count int) (embed *discordgo.MessageEmbed) {
	emoji := b.Settings.GetEmoji(msg.GuildID, settingEmoji)
	minimal := b.Settings.GetBool(msg.GuildID, settingMinimal)
	s := b.Locales.Language(b.Settings.GetString(msg.GuildID, settingLanguage))

	embed = &discordgo.MessageEmbed{
		Author: &discordgo.MessageEmbedAuthor{
			Name: s("message.content"),
			URL:  "https://discordapp.com/channels/" + msg.GuildID + "/" + msg.ChannelID + "/" + msg.ID,
		},
		Color:       gray,
		Description: msg.Content,
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:   s("message.author"),
				Value:  "<@" + msg.AuthorID + ">",
				Inline: true,
			},
			{
				Name:   s("message.channel"),
				Value:  "<#" + msg.ChannelID + ">",
				Inline: true,
			},
		},
	}

	if emoji.ID == "" {
		embed.Footer = &discordgo.MessageEmbedFooter{
			Text: emoji.Unicode + " " + strconv.Itoa(count),
		}
	} else {
		embed.Footer = &discordgo.MessageEmbedFooter{
			Text:    strconv.Itoa(count),
			IconURL: emoji.URL(),
		}
	}

	if !minimal {
		if count != 1 {
			emoji.Name = inflection.Plural(emoji.Name)
		}

		embed.Footer.Text += " " + emoji.Name
		embed.Timestamp = util.SnowflakeTimestamp(msg.ID).Format(time.RFC3339)

		for _, style := range styles {
			if count >= style.max {
				embed.Color = style.color
				break
			}
		}
	}

	if msg.Image != "" {
		embed.Image = &discordgo.MessageEmbedImage{
			URL: msg.Image,
		}
	}

	return
}

func (b *Bot) getMessage(s *discordgo.Session, id, channel string) (msg *tables.Message, err error) {
	key := "messages:" + id
	res := b.Redis.HMGet(key, "author_id", "guild_id", "content", "image")
	if res.Err() != nil {
		return nil, res.Err()
	}

	data := res.Val()

	if data[0] == nil {
		m, err := s.ChannelMessage(channel, id)
		if err != nil {
			return nil, err
		}

		c, err := s.State.Channel(m.ChannelID)
		if err != nil {
			return nil, err
		}

		msg = &tables.Message{
			ID:        id,
			AuthorID:  m.Author.ID,
			ChannelID: m.ChannelID,
			GuildID:   c.GuildID,

			Content: util.GetContent(m),
			Image:   util.GetImage(m),
		}

		completeCount, err := b.countStars(msg, true)
		if err != nil {
			return nil, err
		}

		emoji := b.Settings.GetEmoji(m.GuildID, settingEmoji)
		for _, r := range m.Reactions {
			if r.Emoji.ID == "" {
				if r.Emoji.Name != emoji.Unicode {
					continue
				}
			} else if r.Emoji.ID != emoji.ID {
				continue
			}

			if completeCount == r.Count {
				break
			}

			_, err = b.PG.Model((*tables.Reaction)(nil)).Where("message_id = ?", m.ID).Delete()
			if err != nil && err != pg.ErrNoRows {
				return nil, err
			}

			after := ""
			reactions := make([]tables.Reaction, 0)

			for len(reactions) < r.Count {
				users, err := s.MessageReactions(m.ChannelID, m.ID, r.Emoji.APIName(), 100, "", after)
				if err != nil {
					return nil, err
				}

				for _, u := range users {
					reactions = append(reactions, tables.Reaction{
						Bot:       u.Bot,
						UserID:    u.ID,
						MessageID: m.ID,
					})
				}

				if len(users) != 0 {
					after = users[len(users)-1].ID
				}
			}

			if len(reactions) != 0 {
				_, err = b.PG.Model(&reactions).OnConflict("DO NOTHING").Insert()
				if err != nil {
					return nil, err
				}
			}

			break
		}

		go b.cacheMessage(m)
	} else {
		msg = &tables.Message{
			ID:        id,
			AuthorID:  data[0].(string),
			ChannelID: channel,
			GuildID:   data[1].(string),

			Content: data[2].(string),
			Image:   data[3].(string),
		}
	}

	return
}

func (b *Bot) cacheMessage(m *discordgo.Message) (err error) {
	key := "messages:" + m.ID

	err = b.Redis.HMSet(key, map[string]interface{}{
		"author_id":  m.Author.ID,
		"channel_id": m.ChannelID,
		"guild_id":   m.GuildID,

		"content": util.GetContent(m),
		"image":   util.GetImage(m),
	}).Err()
	if err != nil {
		return
	}

	return b.Redis.Expire(key, expiryTime).Err()
}

func (b *Bot) createMessage(s *discordgo.Session, id, channel, guild string) (err error) {
	msg, err := b.getMessage(s, id, channel)
	if err != nil {
		return
	}

	c, _ := b.PG.
		Model((*tables.Block)(nil)).
		Where("guild_id = ?", msg.GuildID).
		Where("type = 'user' AND id = ?", msg.AuthorID).
		WhereOr("type = 'channel' AND id = ?", msg.ChannelID).
		Count()

	switch b.Settings.GetString(msg.GuildID, settingBlockMode) {
	case "blacklist":
		if c != 0 {
			return
		}

	case "whitelist":
		if c == 0 {
			return
		}
	}

	starboard := b.getStarboard(s, msg.ChannelID, msg.GuildID)
	if starboard == settingNone {
		return
	}

	count, err := b.countStars(msg, false)
	if err != nil {
		return
	}

	if count < b.Settings.GetInt(msg.GuildID, settingMinimum) {
		return
	}

	sent, err := s.ChannelMessageSendEmbed(starboard, b.generateEmbed(msg, count))
	if err != nil {
		return
	}

	msg.SentID = sent.ID
	err = b.PG.Insert(msg)
	if err != nil {
		e, ok := err.(pg.Error)
		if ok && e.IntegrityViolation() {
			s.ChannelMessageDelete(starboard, sent.ID)
			return nil
		}
	}

	return
}

func (b *Bot) countStars(msg *tables.Message, raw bool) (int, error) {
	q := b.PG.Model((*tables.Reaction)(nil)).Where("message_id = ?", msg.ID)

	if !raw {
		if !b.Settings.GetBool(msg.GuildID, settingSelfStar) {
			q = q.Where("user_id != ?", msg.AuthorID)
		}

		if b.Settings.GetBool(msg.GuildID, settingRemoveBotStars) {
			q = q.Where("bot = FALSE")
		}
	}

	return q.Count()
}

func (b *Bot) updateMessage(s *discordgo.Session, id, channel, guild string) (err error) {
	msg := &tables.Message{ID: id}
	err = b.PG.Select(msg)
	if err != nil {
		if err == pg.ErrNoRows {
			return b.createMessage(s, id, channel, guild)
		}

		return
	}

	count, err := b.countStars(msg, false)
	if err != nil {
		return
	}

	starboard := b.getStarboard(s, msg.ChannelID, msg.GuildID)
	if starboard == settingNone {
		return
	}

	if count < b.Settings.GetInt(msg.GuildID, settingMinimum) {
		go s.ChannelMessageDelete(starboard, msg.SentID)
		go b.PG.Delete(msg)
		return
	}

	embed := b.generateEmbed(msg, count)
	_, err = s.ChannelMessageEditEmbed(starboard, msg.SentID, embed)
	if err == nil {
		return
	}

	if rErr, ok := err.(*discordgo.RESTError); ok && rErr.Message != nil {
		if rErr.Message.Code != discordgo.ErrCodeUnknownMessage {
			return
		}

		sent, err := s.ChannelMessageSendEmbed(starboard, embed)
		if err != nil {
			return err
		}

		_, err = b.PG.Model(&tables.Message{ID: id}).WherePK().Set("sent_id = ?", sent.ID).Update()
		return err
	}

	return
}
