package settings

import (
	"errors"
	"reflect"
	"strconv"
	"strings"

	"github.com/xdimgg/starboard/bot/util"
)

func serialize(v interface{}) string {
	switch v.(type) {
	case int:
		return "i" + strconv.Itoa(v.(int))

	case bool:
		if v.(bool) {
			return "1"
		}

		return "0"

	case string:
		return "s" + v.(string)

	case *util.Emoji:
		e := v.(*util.Emoji)
		var str string
		if e.Animated {
			str = "a"
		}

		return str + "," + e.ID + "," + e.Name + "," + e.Unicode

	default:
		panic(errors.New("Unhandled type: " + reflect.TypeOf(v).Name()))
	}
}

func deserialize(str string) interface{} {
	if str == "1" {
		return true
	}

	if str == "0" {
		return false
	}

	if str[0] == 'i' {
		i, _ := strconv.Atoi(str[1:])
		return i
	}

	if str[0] == 's' {
		return str[1:]
	}

	split := strings.Split(str, ",")

	return &util.Emoji{
		Animated: len(split[0]) == 1,
		ID:       split[1],
		Name:     split[2],
		Unicode:  split[3],
	}
}
