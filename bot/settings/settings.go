package settings

import (
	"sync"

	"github.com/xdimgg/starboard/bot/util"

	"github.com/go-pg/pg"
	"github.com/go-pg/pg/orm"
)

// Settings represents the settings struct
type Settings struct {
	db       *pg.DB
	pMu      *sync.Mutex
	dMu      *sync.Mutex
	prefixes map[string]string
	Defaults map[string]string
}

// Setting represents a setting database entry
type Setting struct {
	ID    string `sql:",pk"`
	Key   string `sql:",pk"`
	Value string
}

// New creates a new settings instance
func New(db *pg.DB, defaults map[string]interface{}) (s *Settings, err error) {
	s = &Settings{
		db:       db,
		dMu:      &sync.Mutex{},
		pMu:      &sync.Mutex{},
		prefixes: make(map[string]string),
		Defaults: make(map[string]string),
	}

	for key, value := range defaults {
		s.Defaults[key] = serialize(value)
	}

	err = s.db.CreateTable((*Setting)(nil), &orm.CreateTableOptions{IfNotExists: true})
	if err != nil {
		return
	}

	var settings []Setting
	err = s.db.Model(&settings).Where("key = 'prefix'").Returning("id, value").Select()
	if err != nil {
		return
	}

	for _, row := range settings {
		s.setPrefix(row.ID, deserialize(row.Value).(string))
	}

	return
}

func (s *Settings) getDefault(key string) interface{} {
	s.dMu.Lock()
	defer s.dMu.Unlock()
	return deserialize(s.Defaults[key])
}

func (s *Settings) getPrefix(id string) string {
	s.pMu.Lock()
	defer s.pMu.Unlock()
	return s.prefixes[id]
}

func (s *Settings) setPrefix(id, value string) {
	s.pMu.Lock()
	s.prefixes[id] = value
	s.pMu.Unlock()
}

// Get gets a setting
func (s *Settings) Get(id, key string) interface{} {
	if key == "prefix" {
		prefix := s.getPrefix(id)

		if prefix == "" {
			return s.getDefault(key).(string)
		}

		return prefix
	}

	row := &Setting{ID: id, Key: key}
	err := s.db.Select(row)
	if err == nil {
		return deserialize(row.Value)
	}

	return s.getDefault(key)
}

// GetID gets all the settings of an ID
func (s *Settings) GetID(id string) map[string]interface{} {
	var rows []Setting
	s.db.Model(&rows).Where("id = ?", id).Select()

	settings := make(map[string]interface{})

	for k, v := range s.Defaults {
		settings[k] = deserialize(v)
	}

	for _, row := range rows {
		settings[row.Key] = deserialize(row.Value)
	}

	return settings
}

// GetInt gets a setting as an int
func (s *Settings) GetInt(id, key string) int {
	return s.Get(id, key).(int)
}

// GetString gets a setting as a string
func (s *Settings) GetString(id, key string) string {
	return s.Get(id, key).(string)
}

// GetBool gets a setting as a bool
func (s *Settings) GetBool(id, key string) bool {
	return s.Get(id, key).(bool)
}

// GetEmoji gets a setting as an emoji
func (s *Settings) GetEmoji(id, key string) *util.Emoji {
	return s.Get(id, key).(*util.Emoji)
}

// Set sets a setting
func (s *Settings) Set(id, key string, value interface{}) (err error) {
	if key == "prefix" {
		s.setPrefix(id, value.(string))
	}

	_, err = s.db.
		Model(&Setting{ID: id, Key: key, Value: serialize(value)}).
		OnConflict("(id, key) DO UPDATE").
		Set("value = excluded.value").
		Insert()
	return
}
