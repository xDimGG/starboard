package commandler

import (
	"errors"
	"regexp"
	"strings"

	"github.com/bwmarrin/discordgo"
)

// Context represents the context of where a command was called
type Context struct {
	*discordgo.Message
	Args       []string
	Session    *discordgo.Session
	Command    *Command
	Commandler *Commandler
	Prefix     string
	Locale     func(string, ...interface{}) string
	Language   string
}

var (
	reChannelMention = regexp.MustCompile(`<#(\d{17,19})>`)
	reRoleMention    = regexp.MustCompile(`<@&(\d{17,19})>`)
)

var everyoneReplacer = strings.NewReplacer(
	"@everyone", "@\u200beveryone",
	"@here", "@\u200bhere",
)

// S gets the phrase for a language asset code and panics if it doesn't exist
func (ctx *Context) S(code string, values ...interface{}) string {
	translation := ctx.Locale(code, values...)

	if translation == "" {
		panic(errors.New("no translation for " + code))
	}

	return everyoneReplacer.Replace(translation)
}

// SayRaw acts as an alias for ChannelMessageSend
func (ctx *Context) SayRaw(content string) (*discordgo.Message, error) {
	return ctx.Session.ChannelMessageSend(ctx.ChannelID, content)
}

// Say acts as an alias for ChannelMessageSend with localization
func (ctx *Context) Say(code string, values ...interface{}) (*discordgo.Message, error) {
	return ctx.SayRaw(ctx.S(code, values...))
}

// Edit edit's a message using localization
func (ctx *Context) Edit(m *discordgo.Message, code string, values ...interface{}) (*discordgo.Message, error) {
	return ctx.Session.ChannelMessageEdit(ctx.ChannelID, m.ID, ctx.S(code, values...))
}

// Guild returns this messages's guild
func (ctx *Context) Guild() *discordgo.Guild {
	g, _ := ctx.Session.State.Guild(ctx.GuildID)
	return g
}

// VoiceState returns this message author's voice state
func (ctx *Context) VoiceState() *discordgo.VoiceState {
	g := ctx.Guild()
	if g == nil {
		return nil
	}

	for _, vs := range g.VoiceStates {
		if vs.UserID == ctx.Author.ID {
			return vs
		}
	}

	return nil
}

// MentionedChannels returns all the mentioned channels in a message
func (ctx *Context) MentionedChannels() (channels []*discordgo.Channel) {
	for _, mention := range reChannelMention.FindAllStringSubmatch(ctx.Content, -1) {
		channel, err := ctx.Session.State.Channel(mention[1])
		if err == nil && channel.GuildID == ctx.GuildID {
			channels = append(channels, channel)
		}
	}

	return
}

// MentionedRoles returns all the mentioned roles in a message
func (ctx *Context) MentionedRoles() (roles []*discordgo.Role) {
	for _, mention := range reRoleMention.FindAllStringSubmatch(ctx.Content, -1) {
		role, err := ctx.Session.State.Role(ctx.GuildID, mention[1])
		if err == nil {
			roles = append(roles, role)
		}
	}

	return
}
