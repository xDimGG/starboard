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
	cMu      *sync.Mutex
	cache    map[string]*sync.Map
	Defaults *sync.Map
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
		cMu:      &sync.Mutex{},
		cache:    make(map[string]*sync.Map),
		Defaults: &sync.Map{},
	}

	for key, value := range defaults {
		s.Defaults.Store(key, value)
	}

	err = s.db.CreateTable((*Setting)(nil), &orm.CreateTableOptions{IfNotExists: true})
	if err != nil {
		return
	}

	var settings []Setting
	err = s.db.Model(&settings).Select()
	if err != nil {
		return
	}

	for _, row := range settings {
		if _, ok := s.cache[row.ID]; !ok {
			s.cache[row.ID] = &sync.Map{}
		}

		s.cache[row.ID].Store(row.Key, deserialize(row.Value))
	}

	return
}

// Get gets a setting
func (s *Settings) Get(id, key string) interface{} {
	s.cMu.Lock()
	cache, ok := s.cache[id]
	s.cMu.Unlock()

	if ok {
		value, ok := cache.Load(key)
		if ok {
			return value
		}
	}

	value, _ := s.Defaults.Load(key)
	return value
}

// GetID gets all the settings of an ID
func (s *Settings) GetID(id string) map[string]interface{} {
	s.cMu.Lock()
	cache, ok := s.cache[id]
	s.cMu.Unlock()

	values := make(map[string]interface{})

	s.Defaults.Range(func(key, value interface{}) bool {
		values[key.(string)] = value
		return true
	})

	if ok {
		cache.Range(func(key, value interface{}) bool {
			values[key.(string)] = value
			return true
		})
	}

	return values
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
	s.cMu.Lock()
	_, ok := s.cache[id]
	if !ok {
		s.cache[id] = &sync.Map{}
	}

	s.cache[id].Store(key, value)
	s.cMu.Unlock()

	_, err = s.db.
		Model(&Setting{ID: id, Key: key, Value: serialize(value)}).
		OnConflict("(id, key) DO UPDATE").
		Set("value = excluded.value").
		Insert()
	return
}
