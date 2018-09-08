package util

import (
	"encoding/base64"
	"path"
	"strings"

	"github.com/bwmarrin/discordgo"
)

var mdReplacer = strings.NewReplacer(
	"_", "\\_",
	"*", "\\*",
	"`", "\\`",
	"~", "\\`",
)

// Emoji represents a Discord emoji
type Emoji struct {
	ID       string `json:"id,omitempty"`
	Name     string `json:"name"`
	Unicode  string `json:"unicode,omitempty"`
	Animated bool   `json:"animated"`
}

// String returns the emoji as a Discord string
func (e Emoji) String() string {
	if e.Unicode != "" {
		return e.Unicode
	}

	str := "<"

	if e.Animated {
		str += "a"
	}

	return str + ":" + e.Name + ":" + e.ID + ">"
}

// URL returns the emoji's image URL
func (e Emoji) URL() string {
	if e.ID == "" {
		return ""
	}

	url := "https://cdn.discordapp.com/emojis/" + e.ID

	if e.Animated {
		url += ".gif"
	} else {
		url += ".png"
	}

	return url
}

// EscapeMarkdown escapes Discord markdown
func EscapeMarkdown(str string) string {
	return mdReplacer.Replace(str)
}

// PanicIf panics if err != nil
func PanicIf(err error) {
	if err != nil {
		panic(err)
	}
}

// ParseID extracts the ID of a token
func ParseID(token string) string {
	var t string

	if words := strings.Split(token, " "); len(words) == 2 {
		t = words[1]
	} else {
		t = words[0]
	}

	s, _ := base64.StdEncoding.DecodeString(t)
	return string(s)
}

// ParseEmoji parses an emoji
func ParseEmoji(emoji string) *Emoji {
	emoji = strings.TrimSpace(emoji)

	if name, ok := emojis[emoji]; ok {
		return &Emoji{
			Name:    name,
			Unicode: emoji,
		}
	}

	matches := reCustomEmoji.FindStringSubmatch(emoji)
	if matches == nil {
		return nil
	}

	return &Emoji{
		ID:       matches[3],
		Name:     matches[2],
		Animated: matches[1] == "a",
	}
}

// GetMissing gets missing permissions and places them in a codeblock
func GetMissing(have, want int, l func(string, ...interface{}) string) string {
	missing := want &^ have
	perms := "```diff\n"

	for flag, permission := range permissions {
		if missing&flag == flag {
			perms += "- " + l("permissions."+permission) + "\n"
		}
	}

	return perms + "```"
}

// GetImage gets the image attached to a message
func GetImage(m *discordgo.Message) string {
	for _, a := range m.Attachments {
		if a.Width != 0 && isEmbeddable(a.Filename) {
			return a.URL
		}
	}

	for _, e := range m.Embeds {
		switch e.Type {
		case "image":
			return e.URL

		case "rich":
			if e.Image != nil && e.Image.Width != 0 {
				return e.Image.URL
			}
			if e.Thumbnail != nil && e.Thumbnail.Width != 0 {
				return e.Thumbnail.URL
			}
		}
	}

	return ""
}

// GetContent gets the content of a message
func GetContent(m *discordgo.Message) (content string) {
	for _, e := range m.Embeds {
		if e.Type != "rich" {
			continue
		}

		if e.Description != "" {
			content = e.Description
		}
	}

	if content == "" {
		content = m.Content
	}

	if len(m.Attachments) != 0 {
		files := make([]string, 0)

		for _, a := range m.Attachments {
			if !isEmbeddable(a.Filename) {
				files = append(files, "[["+a.Filename+"]]("+a.URL+")")
			}
		}

		if len(files) != 0 {
			fileStr := strings.Join(files, " ")
			if content != "" {
				fileStr = "\n\n" + fileStr
			}

			if len(content)+len(fileStr) <= 2048 {
				content += fileStr
			}
		}
	}

	return
}

func isEmbeddable(filename string) bool {
	switch strings.ToLower(path.Ext(filename)) {
	case ".png", ".jpg", ".jpeg", ".gif", ".webp":
		return true
	}

	return false
}
