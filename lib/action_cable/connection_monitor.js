// Conditional import of react-native AppState
// We use require here because react-native may not be available in all environments
let AppState
try {
  const reactNative = require('react-native')
  AppState = reactNative.AppState
} catch {
  // React Native not available, use mock
  AppState = { 
    currentState: 'active',
    addEventListener: () => ({ remove: () => {} })
  }
}

const APP_STATE_ACTIVE = 'active'

class ConnectionMonitor {
  constructor(connection, log) {
    this.connection = connection
    this.log = log
    this.reconnectAttempts = 0
  }

  start() {
    if (!this.isRunning()) {
      this.startedAt = now()
      delete this.stoppedAt
      this.startPolling()
      this.appStateEventListener = AppState.addEventListener("change", this.visibilityDidChange.bind(this))
      this.log(`ConnectionMonitor started. pollInterval = ${this.getPollInterval()} ms`)
    }
  }

  stop() {
    if (this.isRunning()) {
      this.stoppedAt = now()
      this.stopPolling()
      if (this.appStateEventListener && this.appStateEventListener.remove) {
        this.appStateEventListener.remove()
      }
      this.log("ConnectionMonitor stopped")
    }
  }

  isRunning() {
    return this.startedAt != null && this.stoppedAt == null
  }

  recordPing() {
    this.pingedAt = now()
  }

  recordConnect() {
    this.reconnectAttempts = 0
    this.recordPing()
    delete this.disconnectedAt
    this.log("ConnectionMonitor recorded connect")
  }

  recordDisconnect() {
    this.disconnectedAt = now()
    this.log("ConnectionMonitor recorded disconnect")
  }

  // Private

  startPolling() {
    this.stopPolling()
    this.poll()
  }

  stopPolling() {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
    }
  }

  poll() {
    this.pollTimeout = setTimeout(() => {
      this.reconnectIfStale()
      this.poll()
    }, this.getPollInterval())
  }

  getPollInterval() {
    const { min, max } = ConnectionMonitor.pollInterval
    const interval = 5 * Math.log(this.reconnectAttempts + 1)
    return Math.round(clamp(interval, min, max) * 1000)
  }

  reconnectIfStale() {
    if (this.connectionIsStale()) {
      this.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, pollInterval = ${this.getPollInterval()} ms, time disconnected = ${secondsSince(this.disconnectedAt)} s, stale threshold = ${ConnectionMonitor.staleThreshold} s`)
      this.reconnectAttempts++
      if (this.disconnectedRecently()) {
        this.log("ConnectionMonitor skipping reopening recent disconnect")
      } else {
        this.log("ConnectionMonitor reopening")
        this.connection.reopen()
      }
    }
  }

  connectionIsStale() {
    return secondsSince(this.pingedAt || this.startedAt) > ConnectionMonitor.staleThreshold
  }

  disconnectedRecently() {
    return this.disconnectedAt && secondsSince(this.disconnectedAt) < ConnectionMonitor.staleThreshold
  }

  visibilityDidChange() {
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

ConnectionMonitor.pollInterval = {
  min: 3,
  max: 30
}

ConnectionMonitor.staleThreshold = 6 // Server::Connections::BEAT_INTERVAL * 2 (missed two pings)

function now() {
  return new Date().getTime()
}

function secondsSince(time) {
  if (time == null) return Infinity
  return (now() - time) / 1000
}

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number))
}

module.exports = ConnectionMonitor