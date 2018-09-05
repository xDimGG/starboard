package commandler

// Command represents a command
type Command struct {
	Run         func(*Context) error
	Name        string
	Info        string
	Usage       string
	Aliases     []string
	GuildOnly   bool
	OwnerOnly   bool
	ClientPerms int
	MemberPerms int
}
