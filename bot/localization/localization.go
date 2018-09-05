package localization

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// Asset represents a language's assets
type Asset struct {
	sync.Mutex
	Translations map[string]interface{}
}

// Locales stores all assets
type Locales struct {
	sync.Mutex
	Assets map[string]*Asset
	dir    string
	enUS   *Asset
}

// New creates a new Locales from a directory
func New(dir string) (l *Locales, err error) {
	l = &Locales{
		Assets: make(map[string]*Asset),
		dir:    dir,
	}

	return l, l.ReadAll()
}

// ReadAll reads all the translations in the provided directory
func (l *Locales) ReadAll() (err error) {

	files, err := ioutil.ReadDir(l.dir)
	if err != nil {
		return
	}

	var final error
	var wg sync.WaitGroup
	wg.Add(len(files))

	for _, file := range files {
		go func(file os.FileInfo) {
			defer wg.Done()

			content, err := ioutil.ReadFile(filepath.Join(l.dir, file.Name()))
			if err != nil {
				final = err
				return
			}

			a := &Asset{
				Translations: make(map[string]interface{}),
			}
			err = json.Unmarshal(content, &a.Translations)
			if err != nil {
				final = err
				return
			}

			l.Lock()
			l.Assets[strings.TrimSuffix(file.Name(), filepath.Ext(file.Name()))] = a
			l.Unlock()
		}(file)
	}

	wg.Wait()

	l.enUS = l.Asset("en-US")

	return final
}

// Asset gets an asset by its code
func (l *Locales) Asset(code string) *Asset {
	l.Lock()
	defer l.Unlock()
	return l.Assets[code]
}

// Translation gets the translation for the specified resource
func (a *Asset) Translation(resource string) interface{} {
	a.Lock()
	defer a.Unlock()
	return a.Translations[resource]
}

// Language returns a function that gets a translation for that string and falls back to english
func (l *Locales) Language(code string) func(string, ...interface{}) string {
	a := l.Asset(code)

	return func(resource string, values ...interface{}) string {
		if a == nil {
			t := l.enUS.Translation(resource)
			if t == nil {
				return ""
			}

			return fmt.Sprintf(t.(string), values...)
		}

		translation := a.Translation(resource)

		if translation == nil {
			t := l.enUS.Translation(resource)
			if t == nil {
				return ""
			}

			return fmt.Sprintf(t.(string), values...)
		}

		return fmt.Sprintf(translation.(string), values...)
	}
}
