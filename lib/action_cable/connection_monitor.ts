// AppState for React Native - fallback to mock for web environments
interface AppStateStatic {
  currentState: string
  addEventListener: (type: string, listener: () => void) => { remove: () => void }
}

let AppState: AppStateStatic = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
}

// Try to use React Native's AppState if available
try {

  const RN = (globalThis as { require?: (id: string) => { AppState?: AppStateStatic } }).require?.('react-native')
  if (RN?.AppState) {
    AppState = RN.AppState
  }
} catch {
  // React Native not available, use mock
}

const APP_STATE_ACTIVE = 'active'

export interface Connection {
  reopen(): void
  isOpen(): boolean
}

export type LogFunction = (...args: any[]) => void

class ConnectionMonitor {
  static readonly staleThreshold = 6 // Server::Connections::BEAT_INTERVAL * 2 (missed two pings)
  static readonly reconnectionBackoffRate = 0.15

  connection: Connection
  log: LogFunction
  reconnectAttempts: number = 0
  startedAt?: number
  stoppedAt?: number
  pingedAt?: number
  disconnectedAt?: number
  pollTimeout?: any
  appStateEventListener?: any

  constructor(connection: Connection, log: LogFunction) {
    this.connection = connection
    this.log = log
  }

  start = (): void => {
    if (!this.isRunning()) {
      this.startedAt = now()
      delete this.stoppedAt
      this.startPolling()
      this.appStateEventListener = AppState.addEventListener('change', this.visibilityDidChange)
      this.log(`ConnectionMonitor started. pollInterval = ${this.getPollInterval()} ms`)
    }
  }

  stop = (): void => {
    if (this.isRunning()) {
      this.stoppedAt = now()
      this.stopPolling()
      this.appStateEventListener?.remove()
      this.log('ConnectionMonitor stopped')
    }
  }

  isRunning = (): boolean => {
    return this.startedAt != null && this.stoppedAt == null
  }

  recordMessage = (): void => {
    this.pingedAt = now()
  }

  recordPing = (): void => {
    this.recordMessage()
  }

  recordConnect = (): void => {
    this.reconnectAttempts = 0
    delete this.disconnectedAt
    this.log('ConnectionMonitor recorded connect')
  }

  recordDisconnect = (): void => {
    this.disconnectedAt = now()
    this.log('ConnectionMonitor recorded disconnect')
  }

  // Private

  startPolling = (): void => {
    this.stopPolling()
    this.poll()
  }

  stopPolling = (): void => {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
    }
  }

  poll = (): void => {
    this.pollTimeout = setTimeout(() => {
      this.reconnectIfStale()
      this.poll()
    }, this.getPollInterval())
  }

  getPollInterval = (): number => {
    const { staleThreshold, reconnectionBackoffRate } = ConnectionMonitor
    const backoff = Math.pow(1 + reconnectionBackoffRate, Math.min(this.reconnectAttempts, 10))
    const jitterMax = this.reconnectAttempts === 0 ? 1 : reconnectionBackoffRate
    const jitter = jitterMax * Math.random()
    return staleThreshold * 1000 * backoff * (1 + jitter)
  }

  reconnectIfStale = (): void => {
    if (this.connectionIsStale()) {
      this.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, time stale = ${secondsSince(this.refreshedAt)} s, stale threshold = ${ConnectionMonitor.staleThreshold} s`)
      this.reconnectAttempts++
      if (this.disconnectedRecently()) {
        this.log(`ConnectionMonitor skipping reopening recent disconnect. time disconnected = ${secondsSince(this.disconnectedAt)} s`)
      } else {
        this.log('ConnectionMonitor reopening')
        this.connection.reopen()
      }
    }
  }

  get refreshedAt(): number | undefined {
    return this.pingedAt ?? this.startedAt
  }

  connectionIsStale = (): boolean => {
    return secondsSince(this.refreshedAt) > ConnectionMonitor.staleThreshold
  }

  disconnectedRecently = (): boolean => {
    return this.disconnectedAt !== undefined && secondsSince(this.disconnectedAt) < ConnectionMonitor.staleThreshold
  }

  visibilityDidChange = (): void => {
    if (AppState.currentState === APP_STATE_ACTIVE) {
      setTimeout(() => {
        if (this.connectionIsStale() || !this.connection.isOpen()) {
          this.log(`ConnectionMonitor reopening stale connection on change. visbilityState = ${AppState.currentState}`)
          this.connection.reopen()
        }
      }, 200)
    }
  }
}

function now(): number {
  return new Date().getTime()
}

function secondsSince(time?: number): number {
  if (time == null) return Infinity
  return (now() - time) / 1000
}

export default ConnectionMonitor
