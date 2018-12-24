package lockergroup

import "sync"

// LockerGroup group's locks by keys
type LockerGroup struct {
	mu     sync.RWMutex
	groups map[string]*locker
}

// New creates a LockerGroup
func New() *LockerGroup {
	return &LockerGroup{groups: make(map[string]*locker)}
}

func (lg *LockerGroup) group(key string) (l *locker) {
	lg.mu.RLock()
	l, ok := lg.groups[key]
	lg.mu.RUnlock()

	if !ok {
		l = newLocker()
		lg.mu.Lock()
		lg.groups[key] = l
		lg.mu.Unlock()
	}

	return
}

// Lock locks a group
func (lg *LockerGroup) Lock(key string) {
	lg.group(key).lock()
}

// Unlock unlocks a group
func (lg *LockerGroup) Unlock(key string) {
	l := lg.group(key)
	l.unlock()

	if l.count() <= 0 {
		lg.mu.Lock()
		delete(lg.groups, key)
		lg.mu.Unlock()
	}
}
