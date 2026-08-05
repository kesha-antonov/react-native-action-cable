import ConnectionMonitor from '../lib/action_cable/connection_monitor'
import type { Connection } from '../lib/action_cable/connection_monitor'

declare const require: (id: string) => unknown

// A single virtual `react-native` module whose behaviour each test picks:
// a double when `mockAppState` is set, "not installed" when it is null.
let mockAppState: AppStateDouble | null = null
jest.mock('react-native', () => {
  if (!mockAppState) {
    throw new Error("Cannot find module 'react-native'")
  }
  return { AppState: mockAppState }
}, { virtual: true })

interface AppStateDouble {
  currentState: string
  addEventListener: jest.Mock
  listeners: Array<() => void>
  emit(): void
  listenerCount(): number
}

function buildAppState(currentState = 'active'): AppStateDouble {
  const listeners: Array<() => void> = []
  return {
    currentState,
    listeners,
    addEventListener: jest.fn((_type: string, listener: () => void) => {
      listeners.push(listener)
      return {
        remove: () => {
          const index = listeners.indexOf(listener)
          if (index >= 0) listeners.splice(index, 1)
        },
      }
    }),
    emit: () => listeners.slice().forEach(listener => listener()),
    listenerCount: () => listeners.length,
  }
}

/** Reloads the module so the `react-native` lookup runs again. */
function loadConnectionMonitor(appState?: AppStateDouble): typeof ConnectionMonitor {
  mockAppState = appState ?? null
  jest.resetModules()
  const loaded = require('../lib/action_cable/connection_monitor') as { default: typeof ConnectionMonitor }
  return loaded.default
}

function buildConnection() {
  return {
    reopen: jest.fn(),
    isOpen: jest.fn(() => true),
  } satisfies Connection & { reopen: jest.Mock; isOpen: jest.Mock }
}

const staleThresholdMs = ConnectionMonitor.staleThreshold * 1000

describe('ConnectionMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
    jest.resetModules()
    mockAppState = null
  })

  describe('lifecycle', () => {
    it('starts and stops', () => {
      const monitor = new ConnectionMonitor(buildConnection(), jest.fn())
      expect(monitor.isRunning()).toBe(false)

      monitor.start()
      expect(monitor.isRunning()).toBe(true)

      monitor.stop()
      expect(monitor.isRunning()).toBe(false)
    })

    it('is idempotent', () => {
      const AppState = buildAppState()
      const Monitor = loadConnectionMonitor(AppState)
      const monitor = new Monitor(buildConnection(), jest.fn())

      monitor.start()
      monitor.start()
      expect(AppState.listenerCount()).toBe(1)

      monitor.stop()
      monitor.stop()
      expect(AppState.listenerCount()).toBe(0)
    })

    it('stops polling when stopped', () => {
      const connection = buildConnection()
      const monitor = new ConnectionMonitor(connection, jest.fn())
      monitor.start()
      monitor.stop()

      jest.advanceTimersByTime(staleThresholdMs * 10)

      expect(connection.reopen).not.toHaveBeenCalled()
    })
  })

  describe('staleness', () => {
    it('reopens the connection once no message has been seen for the stale threshold', () => {
      const connection = buildConnection()
      const monitor = new ConnectionMonitor(connection, jest.fn())
      monitor.start()

      // The first poll lands exactly on the threshold: not stale yet
      jest.advanceTimersByTime(staleThresholdMs)
      expect(connection.reopen).not.toHaveBeenCalled()

      jest.advanceTimersByTime(staleThresholdMs + 1)
      expect(connection.reopen).toHaveBeenCalledTimes(1)
      expect(monitor.reconnectAttempts).toBe(1)
    })

    it('stays quiet while messages keep arriving', () => {
      const connection = buildConnection()
      const monitor = new ConnectionMonitor(connection, jest.fn())
      monitor.start()

      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(staleThresholdMs / 2)
        monitor.recordMessage()
      }

      expect(connection.reopen).not.toHaveBeenCalled()
      expect(monitor.connectionIsStale()).toBe(false)
    })

    it('does not reopen right after a disconnect was recorded', () => {
      const connection = buildConnection()
      const monitor = new ConnectionMonitor(connection, jest.fn())
      monitor.start()
      jest.advanceTimersByTime(staleThresholdMs * 1.5)
      monitor.recordDisconnect()

      // Far enough for the connection to look stale, close enough for the
      // disconnect to still count as recent
      jest.advanceTimersByTime(staleThresholdMs * 0.75)

      expect(monitor.disconnectedRecently()).toBe(true)
      expect(connection.reopen).not.toHaveBeenCalled()
      expect(monitor.reconnectAttempts).toBeGreaterThan(0)
    })

    it('clears the reconnect bookkeeping on connect', () => {
      const monitor = new ConnectionMonitor(buildConnection(), jest.fn())
      monitor.start()
      monitor.recordDisconnect()
      monitor.reconnectAttempts = 4

      monitor.recordConnect()

      expect(monitor.reconnectAttempts).toBe(0)
      expect(monitor.disconnectedRecently()).toBe(false)
    })

    it('regression: a reopened connection is not judged by the previous connection lifetime', () => {
      const connection = buildConnection()
      const monitor = new ConnectionMonitor(connection, jest.fn())
      monitor.start()
      monitor.recordMessage()

      // The app was suspended for a long while and the socket died
      jest.advanceTimersByTime(staleThresholdMs * 20)
      monitor.stop()

      // ...and a brand new socket is opened
      monitor.start()

      expect(monitor.connectionIsStale()).toBe(false)
    })
  })

  describe('poll interval', () => {
    it('backs off as reconnect attempts pile up and stops growing after 10', () => {
      const monitor = new ConnectionMonitor(buildConnection(), jest.fn())

      const intervals = [0, 1, 2, 5, 10, 11, 20].map(attempts => {
        monitor.reconnectAttempts = attempts
        return monitor.getPollInterval()
      })

      expect(intervals[0]).toBe(staleThresholdMs)
      for (let i = 1; i < 5; i++) {
        expect(intervals[i]).toBeGreaterThan(intervals[i - 1])
      }
      expect(intervals[5]).toBe(intervals[4])
      expect(intervals[6]).toBe(intervals[4])
    })

    it('adds jitter', () => {
      jest.spyOn(Math, 'random').mockReturnValue(1)
      const monitor = new ConnectionMonitor(buildConnection(), jest.fn())

      monitor.reconnectAttempts = 0
      expect(monitor.getPollInterval()).toBe(staleThresholdMs * 2)

      monitor.reconnectAttempts = 1
      const backoff = 1 + ConnectionMonitor.reconnectionBackoffRate
      expect(monitor.getPollInterval()).toBeCloseTo(staleThresholdMs * backoff * backoff, 5)
    })
  })

  describe('react native AppState', () => {
    it('regression: subscribes to the app state of react-native when it is available', () => {
      const AppState = buildAppState()
      const Monitor = loadConnectionMonitor(AppState)
      const monitor = new Monitor(buildConnection(), jest.fn())

      monitor.start()

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      expect(AppState.listenerCount()).toBe(1)
    })

    it('falls back to a no-op stub outside react native', () => {
      const Monitor = loadConnectionMonitor()
      const connection = buildConnection()
      const monitor = new Monitor(connection, jest.fn())

      expect(() => monitor.start()).not.toThrow()
      expect(monitor.isRunning()).toBe(true)
      monitor.stop()
    })

    it('reopens a dead connection when the app comes back to the foreground', () => {
      const AppState = buildAppState()
      const Monitor = loadConnectionMonitor(AppState)
      const connection = buildConnection()
      connection.isOpen.mockReturnValue(false)
      const monitor = new Monitor(connection, jest.fn())
      monitor.start()

      AppState.emit()
      expect(connection.reopen).not.toHaveBeenCalled()

      jest.advanceTimersByTime(200)
      expect(connection.reopen).toHaveBeenCalledTimes(1)
    })

    it('leaves a healthy connection alone', () => {
      const AppState = buildAppState()
      const Monitor = loadConnectionMonitor(AppState)
      const connection = buildConnection()
      const monitor = new Monitor(connection, jest.fn())
      monitor.start()

      AppState.emit()
      jest.advanceTimersByTime(200)

      expect(connection.reopen).not.toHaveBeenCalled()
    })

    it('ignores app state changes while the app is in the background', () => {
      const AppState = buildAppState('background')
      const Monitor = loadConnectionMonitor(AppState)
      const connection = buildConnection()
      connection.isOpen.mockReturnValue(false)
      const monitor = new Monitor(connection, jest.fn())
      monitor.start()

      AppState.emit()
      jest.advanceTimersByTime(200)

      expect(connection.reopen).not.toHaveBeenCalled()
    })

    it('regression: does not reopen a connection that was stopped while the check was pending', () => {
      const AppState = buildAppState()
      const Monitor = loadConnectionMonitor(AppState)
      const connection = buildConnection()
      connection.isOpen.mockReturnValue(false)
      const monitor = new Monitor(connection, jest.fn())
      monitor.start()

      AppState.emit()
      monitor.stop()
      jest.advanceTimersByTime(200)

      expect(connection.reopen).not.toHaveBeenCalled()
    })

    it('regression: a foreground check scheduled before stop() never reopens', () => {
      const connection = buildConnection()
      connection.isOpen.mockReturnValue(false)
      const monitor = new ConnectionMonitor(connection, jest.fn())
      monitor.start()

      monitor.visibilityDidChange()
      monitor.stop()
      jest.advanceTimersByTime(200)

      expect(connection.reopen).not.toHaveBeenCalled()
    })

    it('stops listening to app state changes once stopped', () => {
      const AppState = buildAppState()
      const Monitor = loadConnectionMonitor(AppState)
      const connection = buildConnection()
      connection.isOpen.mockReturnValue(false)
      const monitor = new Monitor(connection, jest.fn())

      monitor.start()
      monitor.stop()
      AppState.emit()
      jest.advanceTimersByTime(200)

      expect(AppState.listenerCount()).toBe(0)
      expect(connection.reopen).not.toHaveBeenCalled()
    })
  })
})
