package lockergroup

import (
	"sync"
	"sync/atomic"
)

type locker struct {
	mu sync.Mutex
	c  *int64
}

func (l *locker) lock() {
	atomic.AddInt64(l.c, 1)
	l.mu.Lock()
}

func (l *locker) unlock() {
	atomic.AddInt64(l.c, -1)
	l.mu.Unlock()
}

func (l *locker) count() int64 {
	return atomic.LoadInt64(l.c)
}

func newLocker() *locker {
	return &locker{c: new(int64)}
}
