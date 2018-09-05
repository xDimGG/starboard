package bot

import (
	"math"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/dustin/go-humanize"

	"github.com/go-pg/pg"

	"github.com/xdimgg/starboard/bot/tables"
	"github.com/xdimgg/starboard/bot/util"

	"github.com/bwmarrin/discordgo"

	"github.com/xdimgg/starboard/bot/commandler"
)

const pageSize = 10

var (
	reMessageID       = regexp.MustCompile(`^(\d{17,19})$|https:\/\/(?:ptb\.|canary\.)discordapp\.com\/channels\/\d{17,19}\/(\d{17,19})\/(\d{17,19})`)
	seperatorReplacer = strings.NewReplacer("_", "", "-", "")

	typeToInfo = map[string]struct {
		Identifier string
		Index      int
	}{
		"user":    {"@", 0},
		"channel": {"#", 1},
		// "role":    {"@&", 2},
	}
)

func (b *Bot) registerCommands(c *commandler.Commandler) {
	for _, cmd := range []*commandler.Command{
		{
			Run:  b.runPing,
			Name: "ping",
		},
		{
			Run:         b.runHelp,
			Name:        "help",
			ClientPerms: discordgo.PermissionEmbedLinks,
		},
		{
			Run:       b.runConfig,
			Name:      "config",
			GuildOnly: true,
		},
		{
			Run:         b.runStats,
			Name:        "stats",
			ClientPerms: discordgo.PermissionEmbedLinks,
		},
		{
			Run:  b.runInvite,
			Name: "invite",
		},
		{
			Run:         b.runBlock,
			Name:        "block",
			GuildOnly:   true,
			ClientPerms: discordgo.PermissionEmbedLinks,
		},
		{
			Run:       b.runFix,
			Name:      "fix",
			GuildOnly: true,
		},
		{
			Run:       b.runReloadLocales,
			Name:      "reload-locales",
			OwnerOnly: true,
		},
		{
			Run:         b.runLeaderboard,
			Name:        "leaderboard",
			GuildOnly:   true,
			ClientPerms: discordgo.PermissionEmbedLinks,
		},
	} {
		c.AddCommand(cmd)
	}
}

func (b *Bot) runHelp(ctx *commandler.Context) (err error) {
	names := make([]string, 0)
	for _, c := range ctx.Commandler.Commands {
		if c.OwnerOnly && ctx.Author.ID != ctx.Commandler.OwnerID {
			continue
		}

		names = append(names, c.Name)
	}
	sort.Strings(names)

	var sb strings.Builder
	asset := b.Locales.Asset(ctx.Language)

	for _, name := range names {
		sb.WriteString(util.EscapeMarkdown(ctx.Prefix))
		if strings.HasPrefix(ctx.Prefix, "<@") {
			sb.WriteByte(' ')
		}

		sb.WriteString(ctx.S("commands." + name + ".name"))

		usage := asset.Translation("commands." + name + ".usage")
		if usage != nil {
			sb.WriteString(" " + usage.(string))
		}

		sb.WriteByte('\n')

		sb.WriteString(ctx.S("commands." + name + ".description"))
		sb.WriteByte('\n')

		resource := asset.Translation("commands." + name + ".aliases")
		if resource != nil {
			sb.WriteString("- " + ctx.S("commands.help.phrase.aliases") + ": ")

			aliases := resource.([]interface{})
			strs := make([]string, len(aliases))
			for i, alias := range aliases {
				strs[i] = alias.(string)
			}

			sb.WriteString(strings.Join(strs, ", "))
			sb.WriteByte('\n')
		}

		sb.WriteByte('\n')
	}

	ctx.Session.ChannelMessageSendEmbed(ctx.ChannelID, &discordgo.MessageEmbed{
		Color:       gray,
		Description: sb.String(),
		Title:       ctx.S("commands.help.phrase.commands"),
	})
	return
}

func (b *Bot) runPing(ctx *commandler.Context) (err error) {
	ms := time.Now().UnixNano()

	sent, err := ctx.Say("commands.ping.phrases.pinging")
	if err != nil {
		return
	}

	_, err = ctx.Edit(sent, "commands.ping.phrases.done", (time.Now().UnixNano()-ms)/int64(time.Millisecond))
	return
}

func (b *Bot) runConfig(ctx *commandler.Context) (err error) {
	if len(ctx.Args) == 0 {
		content := ""
		for k, v := range b.Settings.GetID(ctx.GuildID) {
			if strings.Contains(k, "channel") && v == settingNone {
				if ch := findDefaultChannel(k, ctx.Session.State, ctx.Guild(), nil); ch != nil {
					v = ch.ID
				}
			}

			content += ctx.S("settings."+k) + ": " + getSettingString(k, v) + "\n"
		}
		ctx.SayRaw(content)
		return
	}

	key := ctx.Locale("settings.to_key." + seperatorReplacer.Replace(strings.ToLower(ctx.Args[0])))
	if key == "" {
		ctx.Say("settings.phrase.unknown")
		return
	}

	if len(ctx.Args) == 1 {
		str := getSettingString(key, b.Settings.Get(ctx.GuildID, key))

		if strings.Contains(key, settingChannel) && str == settingNone {
			if ch := findDefaultChannel(key, ctx.Session.State, ctx.Guild(), nil); ch != nil {
				str = "<#" + ch.ID + ">"
			}
		}

		ctx.SayRaw(ctx.S("settings."+key) + ": " + str)
		return
	}

	arg := strings.Join(ctx.Args[1:], " ")
	l := ctx.S("settings." + key)
	var value interface{}

	memberPerms, err := ctx.Session.State.UserChannelPermissions(ctx.Author.ID, ctx.ChannelID)
	if err != nil {
		ctx.Say("restrictions.permissions.missing.member.error")
		return
	}

	if memberPerms&discordgo.PermissionManageMessages == 0 {
		ctx.Say("restrictions.permissions.missing.member", "```diff\n- "+ctx.S("permissions.MANAGE_MESSAGES")+"\n```")
		return
	}

	switch key {
	case settingPrefix:
		if len(arg) > 50 {
			ctx.Say("settings.restrictions.max_length", l, 50)
			return
		}

		value = arg
	case settingLanguage:
		if b.Locales.Asset(arg) == nil {
			var langs []string
			for lang := range b.Locales.Assets {
				langs = append(langs, "``"+lang+"``")
			}
			ctx.Say("settings.restrictions.one_of", l, strings.Join(langs, ", "))
			return
		}

		value = arg
	case settingMinimum:
		i, err := strconv.Atoi(arg)
		if err != nil {
			ctx.Say("settings.restrictions.number", l)
			return nil
		}
		if i < 1 {
			ctx.Say("settings.restrictions.min", l, 1)
			return nil
		}
		if i > 100 {
			ctx.Say("settings.restrictions.max", l, 100)
			return nil
		}

		value = i
	case settingSelfStar, settingMinimal, settingRemoveBotStars:
		t := ctx.S("settings.phrase.true")
		f := ctx.S("settings.phrase.false")
		arg = strings.ToLower(arg)

		if arg != t && arg != f {
			ctx.Say("settings.restrictions.one_of", l, "``"+t+"``, ``"+f+"``")
			return
		}

		value = arg == t
	case settingEmoji:
		e := util.ParseEmoji(arg)
		if e == nil {
			ctx.Say("settings.restrictions.emoji", l)
			return
		}

		value = e
	case settingChannel:
		channels := ctx.MentionedChannels()
		if len(channels) == 0 || channels[0].Type != discordgo.ChannelTypeGuildText {
			ctx.Say("settings.restrictions.channel", l)
			return
		}

		perms, err := ctx.Session.State.UserChannelPermissions(ctx.Session.State.User.ID, channels[0].ID)
		if err != nil || perms&discordgo.PermissionSendMessages != discordgo.PermissionSendMessages {
			ctx.Say("settings.restrictions.channel_perms")
			return nil
		}

		value = channels[0].ID
	case settingNSFWChannel:
		channels := ctx.MentionedChannels()
		if len(channels) == 0 || channels[0].Type != discordgo.ChannelTypeGuildText {
			ctx.Say("settings.restrictions.channel", l)
			return
		}

		perms, err := ctx.Session.State.UserChannelPermissions(ctx.Session.State.User.ID, channels[0].ID)
		if err != nil || perms&discordgo.PermissionSendMessages != discordgo.PermissionSendMessages {
			ctx.Say("settings.restrictions.channel_perms")
			return nil
		}

		if !channels[0].NSFW {
			ctx.Say("settings.restrictions.channel_nsfw")
			return nil
		}

		value = channels[0].ID
	case settingBlockMode:
		b := ctx.S("settings.phrase.blacklist")
		w := ctx.S("settings.phrase.whitelist")
		arg = strings.ToLower(arg)

		if arg != b && arg != w {
			ctx.Say("settings.restrictions.one_of", l, "``"+b+"``, ``"+w+"``")
			return
		}

		if arg == b {
			value = "blacklist"
		} else {
			value = "whitelist"
		}
	}

	err = b.Settings.Set(ctx.GuildID, key, value)
	if err != nil {
		return
	}

	ctx.Say("settings.phrase.updated", ctx.S("settings."+key))
	return
}

func (b *Bot) runStats(ctx *commandler.Context) (err error) {
	messageCount, _ := b.PG.Model((*tables.Message)(nil)).Count()
	starCount, _ := b.PG.Model((*tables.Reaction)(nil)).Count()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	var guildCount, channelCount, memberCount int
	for _, s := range b.Manager.Sessions {
		guildCount += len(s.State.Guilds)

		for _, guild := range s.State.Guilds {
			memberCount += guild.MemberCount
			channelCount += len(guild.Channels)
		}
	}

	ctx.Session.ChannelMessageSendEmbed(ctx.ChannelID, &discordgo.MessageEmbed{
		Color: gray,
		Fields: []*discordgo.MessageEmbedField{
			{
				Name: ctx.S("commands.stats.phrase.system"),
				Value: ctx.S(
					"commands.stats.phrase.system_value",
					time.Since(b.StartTime),
					humanize.Bytes(m.Sys),
					runtime.Version(),
					discordgo.VERSION,
				),
			},
			{
				Name: ctx.S("commands.stats.phrase.bot"),
				Value: ctx.S(
					"commands.stats.phrase.bot_value",
					humanize.Comma(int64(len(b.Manager.Sessions))),
					humanize.Comma(int64(guildCount)),
					humanize.Comma(int64(channelCount)),
					humanize.Comma(int64(memberCount)),
				),
			},
			{
				Name: ctx.S("commands.stats.phrase.starboard"),
				Value: ctx.S(
					"commands.stats.phrase.starboard_value",
					humanize.Comma(int64(starCount)),
					humanize.Comma(int64(messageCount)),
				),
			},
		},
	})
	return
}

func (b *Bot) runInvite(ctx *commandler.Context) (err error) {
	ctx.Session.ChannelMessageSendEmbed(ctx.ChannelID, &discordgo.MessageEmbed{
		Color: gray,
		Description: ctx.S(
			"commands.invite.phrase.content",
			"https://discordapp.com/oauth2/authorize?client_id="+ctx.Session.State.User.ID+"&scope=bot&permissions=8",
			"https://discord.gg/MZCKAtF",
			"https://www.patreon.com/starboard",
			"https://www.paypal.me/DimGG",
			"https://discordbots.org/bot/349626729226305537",
		),
	})
	return
}

func (b *Bot) runBlock(ctx *commandler.Context) (err error) {
	if len(ctx.Args) != 0 {
		memberPerms, err := ctx.Session.State.UserChannelPermissions(ctx.Author.ID, ctx.ChannelID)
		if err != nil {
			ctx.Say("restrictions.permissions.missing.member.error")
			return err
		}

		if memberPerms&discordgo.PermissionManageMessages == 0 {
			ctx.Say("restrictions.permissions.missing.member", "```diff\n- "+ctx.S("permissions.MANAGE_MESSAGES")+"\n```")
			return nil
		}

		if len(ctx.Args) == 1 {
			ctx.Say("commands.block.phrase.missing")
			return nil
		}

		action := strings.ToLower(ctx.Args[0])
		add := ctx.S("commands.block.phrase.add")
		remove := ctx.S("commands.block.phrase.remove")
		all := ctx.S("commands.block.phrase.all")

		if action != add && action != remove {
			ctx.Say("settings.restrictions.one_of", "``"+add+"``, ``"+remove+"``")
			return nil
		}

		blocks := make([]tables.Block, 0)

		for _, m := range ctx.Mentions {
			blocks = append(blocks, tables.Block{
				ID:      m.ID,
				GuildID: ctx.GuildID,
				Type:    "user",
			})
		}

		for _, c := range ctx.MentionedChannels() {
			blocks = append(blocks, tables.Block{
				ID:      c.ID,
				GuildID: ctx.GuildID,
				Type:    "channel",
			})
		}

		// for _, r := range ctx.MentionedRoles() {
		// 	blocks = append(blocks, tables.Block{
		// 		ID:      r.ID,
		// 		GuildID: ctx.GuildID,
		// 		Type:    "role",
		// 	})
		// }

		if len(blocks) == 0 && (action != remove || ctx.Args[1] != all) {
			ctx.Say("commands.block.phrase.missing")
			return nil
		}

		if action == add {
			_, err = b.PG.Model(&blocks).OnConflict("DO NOTHING").Insert()
		} else {
			q := b.PG.Model((*tables.Block)(nil)).Where("guild_id = ?", ctx.GuildID)

			if ctx.Args[1] != all {
				ids := make([]string, len(blocks))
				for _, b := range blocks {
					ids = append(ids, b.ID)
				}

				q = q.WhereIn("id IN ?", ids)
			}

			_, err = q.Delete()
		}

		if err != nil {
			if err == pg.ErrNoRows {
				return nil
			}

			if e, ok := err.(pg.Error); ok && e.IntegrityViolation() {
				return nil
			}

			return err
		}
	}

	none := ctx.S("commands.block.phrase.none")
	embed := &discordgo.MessageEmbed{
		Color:       gray,
		Description: ctx.S("settings.phrase.mode", ctx.S("settings.phrase."+b.Settings.GetString(ctx.GuildID, settingBlockMode))),
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:  ctx.S("commands.block.phrase.users"),
				Value: none,
			},
			{
				Name:  ctx.S("commands.block.phrase.channels"),
				Value: none,
			},
			// {
			// 	Name:  ctx.S("commands.block.phrase.roles"),
			// 	Value: none,
			// },
		},
	}

	var blocks []tables.Block
	err = b.PG.Model(&blocks).Where("guild_id = ?", ctx.GuildID).Select()
	if err != nil && err != pg.ErrNoRows {
		return
	}

	for _, b := range blocks {
		info := typeToInfo[b.Type]
		text := "<" + info.Identifier + b.ID + ">\n"
		field := embed.Fields[info.Index]

		if field.Value == none {
			field.Value = text
		} else {
			field.Value += text
		}
	}

	ctx.Session.ChannelMessageSendEmbed(ctx.ChannelID, embed)
	return
}

func (b *Bot) runFix(ctx *commandler.Context) (err error) {
	if len(ctx.Args) == 0 {
		ctx.Say("commands.fix.phrase.id")
		return
	}

	matches := reMessageID.FindStringSubmatch(ctx.Args[0])
	if matches == nil {
		ctx.Say("commands.fix.phrase.id")
		return
	}

	channelID := matches[2]
	messageID := matches[3]

	if channelID == "" {
		channelID = ctx.ChannelID
	}

	if messageID == "" {
		messageID = matches[1]
	}

	required := discordgo.PermissionReadMessages | discordgo.PermissionReadMessageHistory

	perms, err := ctx.Session.State.UserChannelPermissions(ctx.Author.ID, channelID)
	if err != nil || perms&required != required {
		ctx.Say("commands.fix.phrase.permissions")
	}

	err = b.updateMessage(ctx.Session, messageID, channelID, ctx.GuildID)
	if err != nil {
		return
	}

	ctx.Say("commands.fix.phrase.done")
	return
}

func (b *Bot) runReloadLocales(ctx *commandler.Context) (err error) {
	err = b.Locales.ReadAll()
	if err != nil {
		return
	}

	ctx.Say("commands.reload-locales.phrase.done")
	return
}

func (b *Bot) runLeaderboard(ctx *commandler.Context) (err error) {
	var dataTotal struct {
		Count int
	}
	_, err = b.PG.Query(&dataTotal, `
	SELECT COUNT(*) AS count FROM (
		SELECT DISTINCT author_id
		FROM messages
		WHERE guild_id = (?)
	) AS messages
	`, ctx.GuildID)

	if dataTotal.Count == 0 {
		ctx.Say("commands.leaderboard.phrase.empty")
		return
	}

	max := int(math.Ceil(float64(dataTotal.Count) / float64(pageSize)))
	offset := 0
	if len(ctx.Args) != 0 {
		i, err := strconv.Atoi(ctx.Args[0])
		if err != nil {
			ctx.Say("commands.leaderboard.phrase.number")
			return nil
		}

		if i < 1 {
			ctx.Say("commands.leaderboard.phrase.min", 1)
			return nil
		}

		if i > max {
			ctx.Say("commands.leaderboard.phrase.max", max)
			return nil
		}

		offset = max - 1
	}

	extraWhere := ""

	if !b.Settings.GetBool(ctx.GuildID, settingSelfStar) {
		extraWhere += "WHERE messages.author_id != reactions.user_id"
	}

	if b.Settings.GetBool(ctx.GuildID, settingRemoveBotStars) {
		if extraWhere != "" {
			extraWhere += " AND reactions.bot = FALSE"
		}
	}

	var data []struct {
		AuthorID   string
		TotalStars int
	}
	_, err = b.PG.Query(&data, `
	SELECT SUM(star_count) AS total_stars, author_id FROM (
		SELECT COUNT(*) AS star_count, author_id, message_id, guild_id FROM reactions
		JOIN messages ON messages.id = reactions.message_id
		`+extraWhere+`
		GROUP BY author_id, message_id, guild_id
	) AS messages
	WHERE guild_id = (?)
	GROUP BY messages.author_id
	ORDER BY total_stars DESC
	OFFSET (?)
	LIMIT (?)
	`, ctx.GuildID, offset*pageSize, pageSize)
	if err != nil {
		return
	}

	embed := &discordgo.MessageEmbed{
		Color: gray,
		Fields: []*discordgo.MessageEmbedField{
			{
				Name:   "User",
				Inline: true,
			},
			{
				Name:   "Stars",
				Inline: true,
			},
		},
		Footer: &discordgo.MessageEmbedFooter{
			Text: ctx.S("commands.leaderboard.phrase.page", offset+1, max),
		},
	}

	for i, row := range data {
		embed.Fields[0].Value += strconv.Itoa((offset*pageSize)+i+1) + ". <@" + row.AuthorID + ">\n"
		embed.Fields[1].Value += strconv.Itoa(row.TotalStars) + "\n"
	}

	_, err = ctx.Session.ChannelMessageSendEmbed(ctx.ChannelID, embed)
	return
}
