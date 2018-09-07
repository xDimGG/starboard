package bot

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/xdimgg/starboard/bot/util"

	"github.com/bwmarrin/discordgo"
	"github.com/getsentry/raven-go"
	"github.com/go-pg/pg"
	"github.com/go-pg/pg/orm"
	"github.com/go-redis/redis"
	"github.com/jonas747/dshardmanager"
	"github.com/xdimgg/starboard/bot/commandler"
	"github.com/xdimgg/starboard/bot/localization"
	"github.com/xdimgg/starboard/bot/settings"
	"github.com/xdimgg/starboard/bot/tables"
)

const (
	settingPrefix              = "prefix"
	settingLanguage            = "language"
	settingMinimum             = "minimum"
	settingSelfStar            = "self_star"
	settingEmoji               = "emoji"
	settingChannel             = "channel"
	settingNSFWChannel         = "nsfw_channel"
	settingMinimal             = "minimal"
	settingRemoveBotStars      = "remove_bot_stars"
	settingSaveDeletedMessages = "save_deleted_messages"
	settingBlockMode           = "block_mode"

	settingNone = "none"
)

// Bot represents a starboard instance
type Bot struct {
	PG        *pg.DB
	Redis     *redis.Client
	Sentry    *raven.Client
	Manager   *dshardmanager.Manager
	Locales   *localization.Locales
	Settings  *settings.Settings
	StartTime time.Time

	opts *Options
}

// Lists represents bot lists
type Lists []struct{ Key, URL string }

// Options represents the options for creating a starboard instance
type Options struct {
	Prefix    string
	Token     string
	Locales   string
	OwnerID   string
	Mode      string
	SentryDSN string
	Lists     Lists
}

type stats struct {
	ServerCount int `json:"server_count"`
	ShardCount  int `json:"shard_count"`
}

// New creates a starboard instance
func New(botOpts *Options, pgOpts *pg.Options, redisOpts *redis.Options) (err error) {
	b := &Bot{
		PG:        pg.Connect(pgOpts),
		Redis:     redis.NewClient(redisOpts),
		StartTime: time.Now(),
		opts:      botOpts,
	}

	b.Sentry, err = raven.New(botOpts.SentryDSN)
	if err != nil {
		return
	}

	b.Locales, err = localization.New(b.opts.Locales)
	if err != nil {
		return
	}

	b.Settings, err = settings.New(b.PG, map[string]interface{}{
		settingPrefix:   b.opts.Prefix,
		settingLanguage: "en-US",
		settingMinimum:  1,
		settingSelfStar: false,
		settingEmoji: &util.Emoji{
			Name:    "star",
			Unicode: "⭐",
		},
		settingChannel:             settingNone,
		settingNSFWChannel:         settingNone,
		settingMinimal:             false,
		settingRemoveBotStars:      true,
		settingSaveDeletedMessages: false,
		settingBlockMode:           "blacklist",
	})
	if err != nil {
		return
	}

	err = b.createTables((*tables.Message)(nil), (*tables.Reaction)(nil), (*tables.Block)(nil))
	if err != nil {
		return
	}

	b.Manager = dshardmanager.New(b.opts.Token)
	b.Manager.SessionFunc = dshardmanager.SessionFunc(func(token string) (s *discordgo.Session, err error) {
		s, err = discordgo.New("Bot " + token)
		if err != nil {
			return nil, err
		}

		s.State.TrackPresences = false
		s.State.TrackVoice = false

		s.AddHandler(func(s *discordgo.Session, r *discordgo.Ready) {
			s.UpdateStatus(0, "@"+r.User.Username+" help | (just reset database, update your settings)")
		})

		s.AddHandler(func(s *discordgo.Session, m *discordgo.MessageCreate) {
			b.Sentry.CapturePanic(func() {
				b.messageCreate(s, m)
			}, nil)
		})

		s.AddHandler(func(s *discordgo.Session, m *discordgo.MessageUpdate) {
			b.Sentry.CapturePanic(func() {
				b.messageUpdate(s, m)
			}, nil)
		})

		s.AddHandler(func(s *discordgo.Session, m *discordgo.MessageDelete) {
			b.Sentry.CapturePanic(func() {
				b.messageDelete(s, m)
			}, nil)
		})

		s.AddHandler(func(s *discordgo.Session, m *discordgo.MessageDeleteBulk) {
			b.Sentry.CapturePanic(func() {
				b.messageDeleteBulk(s, m)
			}, nil)
		})

		s.AddHandler(func(s *discordgo.Session, m *discordgo.MessageReactionAdd) {
			b.Sentry.CapturePanic(func() {
				b.messageReactionAdd(s, m)
			}, nil)
		})

		s.AddHandler(func(s *discordgo.Session, m *discordgo.MessageReactionRemove) {
			b.Sentry.CapturePanic(func() {
				b.messageReactionRemove(s, m)
			}, nil)
		})

		s.AddHandler(func(s *discordgo.Session, m *discordgo.MessageReactionRemoveAll) {
			b.Sentry.CapturePanic(func() {
				b.messageReactionRemoveAll(s, m)
			}, nil)
		})

		c := commandler.New(s, b.Locales, b.Settings)
		c.OwnerID = b.opts.OwnerID
		b.registerCommands(c)

		if b.prod() {
			c.SetOnError(func(ctx *commandler.Context, err error, panicked bool) {
				b.Sentry.CaptureError(err, map[string]string{
					"command":  ctx.Command.Name,
					"args":     strings.Join(ctx.Args, " "),
					"panicked": strconv.FormatBool(panicked),
				})

				ctx.Say("error")
			})
		} else {
			c.SetOnError(func(ctx *commandler.Context, err error, panicked bool) {
				_, mErr := ctx.SayRaw(fmt.Sprintf("Nice error, dumbass\nPanicked: `%t`\nError:\n```\n%s\n```\nStack trace:\n```\n%s\n```", panicked, err.Error(), debug.Stack()[:1500]))
				if mErr != nil {
					fmt.Println(mErr)
				}
			})
		}

		return
	})

	err = b.Manager.Start()
	if err != nil {
		return
	}

	ticker := time.NewTicker(time.Second * 60)
	stat := &stats{}

	for range ticker.C {
		newStat := &stats{
			ServerCount: 0,
			ShardCount:  len(b.Manager.Sessions),
		}

		for _, s := range b.Manager.Sessions {
			newStat.ServerCount += len(s.State.Guilds)
		}

		if stat.ServerCount == newStat.ServerCount && stat.ShardCount == newStat.ShardCount {
			continue
		}

		stat = newStat

		for _, site := range b.opts.Lists {
			if site.Key == "" {
				continue
			}

			data, err := json.Marshal(stat)
			if err != nil {
				b.Sentry.CaptureError(err, map[string]string{"key": site.Key, "url": site.URL})
				continue
			}

			req, err := http.NewRequest("POST", strings.Replace(site.URL, ":id", b.Manager.Sessions[0].State.User.ID, 1), bytes.NewReader(data))
			if err != nil {
				b.Sentry.CaptureError(err, map[string]string{"key": site.Key, "url": site.URL})
				continue
			}

			req.Header.Set("Authorization", site.Key)
			req.Header.Set("Content-Type", "application/json")

			resp, err := http.DefaultClient.Do(req)
			if resp.StatusCode >= http.StatusBadRequest {
				err = errors.New(resp.Status)
			}

			if err != nil {
				b.Sentry.CaptureError(err, map[string]string{"key": site.Key, "url": site.URL})
			}
		}
	}

	// <-make(chan struct{})
	return
}

func findDefaultChannel(key string, state *discordgo.State, guild *discordgo.Guild, current *discordgo.Channel) (ch *discordgo.Channel) {
	for _, channel := range guild.Channels {
		if channel.Type != discordgo.ChannelTypeGuildText {
			continue
		}

		if key == "nsfw_channel" && !channel.NSFW {
			continue
		}

		if current != nil && ((current.NSFW && !channel.NSFW) || current == channel) {
			continue
		}

		if !strings.Contains(channel.Name, "starboard") {
			continue
		}

		perms, err := state.UserChannelPermissions(state.User.ID, channel.ID)
		if err == nil && perms&discordgo.PermissionSendMessages == discordgo.PermissionSendMessages {
			return channel
		}
	}

	return
}

func getSettingString(key string, value interface{}) string {
	if strings.Contains(key, settingChannel) && value != settingNone {
		if str, ok := value.(string); ok {
			value = "<#" + str + ">"
		}
	}

	if key == settingLanguage {
		value = util.Languages[value.(string)]
	}

	return fmt.Sprintf("%v", value)
}

func (b *Bot) createTables(ts ...interface{}) (err error) {
	for _, t := range ts {
		if b.dev() {
			err = b.PG.DropTable(t, &orm.DropTableOptions{IfExists: true})
			if err != nil {
				return
			}
		}

		err = b.PG.CreateTable(t, &orm.CreateTableOptions{IfNotExists: true})
		if err != nil {
			return
		}
	}

	return
}

func (b *Bot) dev() bool {
	return b.opts.Mode == "dev"
}

func (b *Bot) prod() bool {
	return b.opts.Mode == "prod"
}
