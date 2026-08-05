import INTERNAL from './internal'
import ConnectionMonitor from './connection_monitor'

const { message_types, protocols } = INTERNAL

const supportedProtocols = protocols.slice(0, -1)

// Standard WebSocket readyState values, in numeric order (0..3)
const readyStateNames = ['connecting', 'open', 'closing', 'closed'] as const

export interface Consumer {
  url: string
  headers: any
  subprotocols: string[]
  subscriptions: {
    reload(): void
    notify(identifier: string, callbackName: string, ...args: any[]): void
    reject(identifier: string): void
    notifyAll(callbackName: string, ...args: any[]): void
    confirmSubscription?(identifier: string): void
  }
}

export type LogFunction = (...args: any[]) => void

export type WebSocketConstructor = any

class Connection {
  static readonly reopenDelay = 500

  consumer: Consumer
  log: LogFunction
  WebSocket: WebSocketConstructor
  subscriptions: Consumer['subscriptions']
  monitor: ConnectionMonitor
  disconnected: boolean = true
  reconnectAttempted: boolean = false
  webSocket?: any

  constructor(consumer: Consumer, log: LogFunction, WebSocketClass: WebSocketConstructor) {
    this.consumer = consumer
    this.log = log
    this.WebSocket = WebSocketClass
    this.subscriptions = consumer.subscriptions
    this.monitor = new ConnectionMonitor(this, log)
  }

  send = (data: any): boolean => {
    if (this.isOpen()) {
      this.webSocket.send(JSON.stringify(data))
      return true
    } else {
      return false
    }
  }

  open = (): boolean => {
    if (this.isActive()) {
      this.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`)
      return false
    } else {
      const socketProtocols = [...protocols, ...(this.consumer.subprotocols || [])]
      this.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${socketProtocols}`)
      if (this.webSocket) {
        this.uninstallEventHandlers()
      }
      this.webSocket = new this.WebSocket(this.consumer.url, socketProtocols, { headers: this.consumer.headers })
      this.installEventHandlers()
      this.monitor.start()
      return true
    }
  }

  close = ({ allowReconnect = true }: { allowReconnect?: boolean } = {}): void => {
    if (!allowReconnect) {
      this.monitor.stop()
    }
    // Avoid closing websockets in a "connecting" state due to Safari 15.1+ bug.
    // See: https://github.com/rails/rails/issues/43835#issuecomment-1002288478
    if (this.isOpen()) {
      this.webSocket.close()
    }
  }

  reopen = (): void => {
    this.log(`Reopening WebSocket, current state is ${this.getState()}`)
    if (this.isActive()) {
      try {
        this.close()
      } catch (error) {
        this.log('Failed to reopen WebSocket', error)
      } finally {
        this.log(`Reopening WebSocket in ${Connection.reopenDelay}ms`)
        setTimeout(this.open, Connection.reopenDelay)
      }
    } else {
      this.open()
    }
  }

  getProtocol = (): any => {
    return this.webSocket?.protocol
  }

  isOpen = (): boolean => {
    return this.isState('open')
  }

  isActive = (): boolean => {
    return this.isState('open', 'connecting')
  }

  triedToReconnect = (): boolean => {
    return this.monitor.reconnectAttempts > 0
  }

  // Private

  isProtocolSupported = (): boolean => {
    return supportedProtocols.indexOf(this.getProtocol()) !== -1
  }

  isState = (...states: string[]): boolean => {
    const state = this.getState()
    return state !== null && states.indexOf(state) !== -1
  }

  getState = (): string | null => {
    const socket = this.webSocket
    const readyState = socket?.readyState
    if (readyState == null) {
      return null
    }

    // Resolve the numeric readyState against the constants of the WebSocket
    // implementation actually in use. It is not necessarily the global one:
    // a custom class can be injected via `ActionCable.WebSocket`, and some
    // environments (React Native release builds, Node without a global
    // WebSocket) expose no global at all.
    const sources = [socket, socket.constructor, this.WebSocket, (globalThis as any).WebSocket]
    for (const source of sources) {
      if (source == null) continue
      for (const name of readyStateNames) {
        if (source[name.toUpperCase()] === readyState) {
          return name
        }
      }
    }

    // Fall back to the numbering mandated by the WebSocket spec.
    return readyStateNames[readyState] ?? null
  }

  installEventHandlers = (): void => {
    for (const eventName of Object.keys(this.events)) {
      const handler = (this.events as any)[eventName].bind(this)
      this.webSocket[`on${eventName}`] = handler
    }
  }

  uninstallEventHandlers = (): void => {
    for (const eventName of Object.keys(this.events)) {
      this.webSocket[`on${eventName}`] = () => {}
    }
  }

  events = {
    message: (event: any): void => {
      if (!this.isProtocolSupported()) {
        if (event.data.close) {
          event.data.close()
        }
        return
      }

      const { identifier, message, reason, reconnect, type } = JSON.parse(event.data)
      if (event.data.close) {
        event.data.close()
      }

      this.monitor.recordMessage()

      switch (type) {
        case message_types.welcome:
          if (this.triedToReconnect()) {
            this.reconnectAttempted = true
          }
          this.monitor.recordConnect()
          this.subscriptions.reload()
          break
        case message_types.disconnect:
          this.log(`Disconnecting. Reason: ${reason}`)
          this.close({ allowReconnect: reconnect })
          break
        case message_types.ping:
          break
        case message_types.confirmation:
          if (typeof this.subscriptions.confirmSubscription === 'function') {
            this.subscriptions.confirmSubscription(identifier)
          }
          if (this.reconnectAttempted) {
            this.reconnectAttempted = false
            this.subscriptions.notify(identifier, 'connected', { reconnected: true })
          } else {
            this.subscriptions.notify(identifier, 'connected', { reconnected: false })
          }
          break
        case message_types.rejection:
          this.subscriptions.reject(identifier)
          break
        default:
          this.subscriptions.notify(identifier, 'received', message)
      }
    },

    open: (): void => {
      this.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`)
      this.disconnected = false
      if (!this.isProtocolSupported()) {
        this.log('Protocol is unsupported. Stopping monitor and disconnecting.')
        this.close({ allowReconnect: false })
      }
    },

    close: (event: any): void => {
      this.log('WebSocket onclose event', event?.code, event?.reason)
      if (this.disconnected) return
      this.disconnected = true
      this.monitor.recordDisconnect()
      // React Native reports why a socket failed on the close event, not on the
      // error event, so pass the reason along with the reconnect intent
      this.subscriptions.notifyAll('disconnected', {
        willAttemptReconnect: this.monitor.isRunning(),
        code: event?.code,
        reason: event?.reason,
      })
    },

    error: (event: any): void => {
      this.log('WebSocket onerror event', event)
      // A WebSocket error event carries no detail of its own (React Native
      // dispatches a bare Event), so give listeners something readable and
      // keep the original event available as `error.event`
      this.subscriptions.notifyAll('error', {
        message: event?.message ?? 'WebSocket error',
        event,
      })
    },
  }
}

export default Connection
