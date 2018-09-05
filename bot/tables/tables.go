package tables

// Message represents a Discord message
type Message struct {
	ID        string `sql:",pk"`
	AuthorID  string
	ChannelID string
	GuildID   string
	SentID    string

	Content string
	Image   string
}

// Reaction represents a Discord reaction
type Reaction struct {
	Bot       bool   `sql:",notnull"`
	UserID    string `sql:",pk"`
	MessageID string `sql:",pk"`
}

// Block represents a blocker user/channel/role
type Block struct {
	ID      string `sql:",pk"`
	GuildID string `sql:",pk"`
	Type    string
}
