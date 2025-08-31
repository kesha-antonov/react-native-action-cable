// Conditional import of react-native AppState
// We use require here because react-native may not be available in all environments
let AppState: any;
try {
  const { AppState: RNAppState } = require('react-native');
  AppState = RNAppState;
} catch {
  // React Native not available, use mock
  AppState = { 
    currentState: 'active',
    addEventListener: () => ({ remove: () => {} })
  };
}

const APP_STATE_ACTIVE = 'active';

interface Connection {
  reopen: () => void;
  isOpen: () => boolean;
}

type LogFunction = (...args: any[]) => void;

class ConnectionMonitor {
  static pollInterval = {
    min: 3,
    max: 30
  };

  static staleThreshold = 6; // Server::Connections::BEAT_INTERVAL * 2 (missed two pings)

  private connection: Connection;
  private log: LogFunction;
  private reconnectAttempts: number = 0;
  private startedAt?: number;
  private stoppedAt?: number;
  private pingedAt?: number;
  private disconnectedAt?: number;
  private pollTimeout?: NodeJS.Timeout;
  private appStateEventListener?: any;

  constructor(connection: Connection, log: LogFunction) {
    this.connection = connection;
    this.log = log;
  }

  start = () => {
    if (!this.isRunning()) {
      this.startedAt = now();
      delete this.stoppedAt;
      this.startPolling();
      this.appStateEventListener = AppState.addEventListener("change", this.visibilityDidChange);
      this.log(`ConnectionMonitor started. pollInterval = ${this.getPollInterval()} ms`);
    }
  }

  stop = () => {
    if (this.isRunning()) {
      this.stoppedAt = now();
      this.stopPolling();
      this.appStateEventListener?.remove();
      this.log("ConnectionMonitor stopped");
    }
  }

  isRunning = () => {
    return this.startedAt != null && this.stoppedAt == null;
  }

  recordPing = () => {
    this.pingedAt = now();
  }

  recordConnect = () => {
    this.reconnectAttempts = 0;
    this.recordPing();
    delete this.disconnectedAt;
    this.log("ConnectionMonitor recorded connect");
  }

  recordDisconnect = () => {
    this.disconnectedAt = now();
    this.log("ConnectionMonitor recorded disconnect");
  }

  // Private

  private startPolling = () => {
    this.stopPolling();
    this.poll();
  }

  private stopPolling = () => {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
  }

  private poll = () => {
    this.pollTimeout = setTimeout(() => {
      this.reconnectIfStale();
      this.poll();
    }, this.getPollInterval());
  }

  private getPollInterval = () => {
    const { min, max } = ConnectionMonitor.pollInterval;
    const interval = 5 * Math.log(this.reconnectAttempts + 1);
    return Math.round(clamp(interval, min, max) * 1000);
  }

  private reconnectIfStale = () => {
    if (this.connectionIsStale()) {
      this.log(`ConnectionMonitor detected stale connection. reconnectAttempts = ${this.reconnectAttempts}, pollInterval = ${this.getPollInterval()} ms, time disconnected = ${secondsSince(this.disconnectedAt)} s, stale threshold = ${ConnectionMonitor.staleThreshold} s`);
      this.reconnectAttempts++;
      if (this.disconnectedRecently()) {
        this.log("ConnectionMonitor skipping reopening recent disconnect");
      } else {
        this.log("ConnectionMonitor reopening");
        this.connection.reopen();
      }
    }
  }

  private connectionIsStale = () => {
    return secondsSince(this.pingedAt ?? this.startedAt) > ConnectionMonitor.staleThreshold;
  }

  private disconnectedRecently = () => {
    return this.disconnectedAt && secondsSince(this.disconnectedAt) < ConnectionMonitor.staleThreshold;
  }

  private visibilityDidChange = () => {
    if (AppState.currentState === APP_STATE_ACTIVE) {
      setTimeout(() => {
        if (this.connectionIsStale() || !this.connection.isOpen()) {
          this.log(`ConnectionMonitor reopening stale connection on change. visbilityState = ${AppState.currentState}`);
          this.connection.reopen();
        }
      }, 200);
    }
  }
}

function now(): number {
  return new Date().getTime();
}

function secondsSince(time?: number): number {
  if (time == null) return Infinity;
  return (now() - time) / 1000;
}

function clamp(number: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, number));
}

export default ConnectionMonitor;