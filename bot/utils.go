package bot

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/xdimgg/starboard/bot/util"
)

func findDefaultChannel(key string, state *discordgo.State, guild *discordgo.Guild) *discordgo.Channel {
	for _, channel := range guild.Channels {
		switch {
		case channel.Type != discordgo.ChannelTypeGuildText,
			key == settingNSFWChannel && !channel.NSFW,
			!strings.Contains(channel.Name, "starboard"):
		default:
			perms, err := state.UserChannelPermissions(state.User.ID, channel.ID)
			if err == nil && perms&discordgo.PermissionSendMessages == discordgo.PermissionSendMessages {
				return channel
			}
		}
	}

	return nil
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

	if key == settingRandomStarProbability {
		return strconv.FormatFloat(value.(float64), 'f', -1, 64) + "%"
	}

	return fmt.Sprintf("%v", value)
}
