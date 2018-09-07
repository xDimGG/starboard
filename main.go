package main

import (
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
			Lists: bot.Lists{
				{os.Getenv("DBL_KEY"), "https://discordbots.org/api/bots/:id/stats"},
				{os.Getenv("PW_BOTS_KEY"), "https://bots.discord.pw/api/bots/:id/stats"},
			},
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
