package main

import (
	"encoding/json"
	"os"
	"time"

	"github.com/xdimgg/starboard/bot"

	"github.com/go-pg/pg"

	"github.com/go-redis/redis"
)

func main() {
	if os.Getenv("MODE") == "prod" {
		time.Sleep(time.Second * 10)
	}

	panic(bot.New(
		&bot.Options{
			Prefix:    os.Getenv("BOT_PREFIX"),
			Token:     os.Getenv("BOT_TOKEN"),
			Locales:   os.Getenv("BOT_LOCALES"),
			OwnerID:   os.Getenv("BOT_OWNER_ID"),
			Mode:      os.Getenv("MODE"),
			SentryDSN: os.Getenv("SENTRY_DSN"),
			DiscordLists: []bot.DiscordList{
				{
					Authorization: os.Getenv("DBL_KEY"),
					URL: func(id string) string {
						return "https://discordbots.org/api/bots/" + id + "/stats"
					},
					Serialize: func(shardCount, guildCount int) ([]byte, error) {
						return json.Marshal(map[string]int{
							"shard_count":  shardCount,
							"server_count": guildCount,
						})
					},
				},
				{
					Authorization: os.Getenv("GG_BOTS_KEY"),
					URL: func(id string) string {
						return "https://discord.bots.gg/api/v1/bots/" + id + "/stats"
					},
					Serialize: func(shardCount, guildCount int) ([]byte, error) {
						return json.Marshal(map[string]int{
							"shardCount": shardCount,
							"guildCount": guildCount,
						})
					},
				},
			},
			Guild:            os.Getenv("BOT_GUILD"),
			GuildLogChannel:  os.Getenv("BOT_GUILD_LOG_CHANNEL"),
			MemberLogChannel: os.Getenv("BOT_MEMBER_LOG_CHANNEL"),
		},
		&pg.Options{
			Addr:     os.Getenv("POSTGRES_ADDR"),
			Database: os.Getenv("POSTGRES_DB"),
			Password: os.Getenv("POSTGRES_PASSWORD"),
			User:     os.Getenv("POSTGRES_USER"),
		},
		&redis.Options{
			Addr:     os.Getenv("REDIS_ADDR"),
			Password: os.Getenv("REDIS_PASSWORD"),
		},
	))
}
