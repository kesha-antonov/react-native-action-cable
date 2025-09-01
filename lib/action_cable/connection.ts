import INTERNAL from './internal'
import ConnectionMonitor from './connection_monitor'

const { message_types, protocols } = INTERNAL

const [supportedProtocols, unsupportedProtocol] = protocols.slice(0, -1).concat([protocols[protocols.length - 1]])

export interface Consumer {
  url: string
  headers: any
  subscriptions: {
    reload(): void
    notify(identifier: string, callbackName: string, ...args: any[]): void
    reject(identifier: string): void
    notifyAll(callbackName: string, ...args: any[]): void
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
      this.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`)
      if (this.webSocket) {
        this.uninstallEventHandlers()
      }
      this.webSocket = new this.WebSocket(this.consumer.url, protocols, { headers: this.consumer.headers })
      this.installEventHandlers()
      this.monitor.start()
      return true
    }
  }

  close = ({ allowReconnect = true }: { allowReconnect?: boolean } = {}): void => {
    if (!allowReconnect) {
      this.monitor.stop()
    }
    if (this.webSocket && this.isActive()) {
      this.webSocket.close()
    }
  }

  reopen = (): void => {
    this.log(`Reopening WebSocket, current state is ${this.getState()}`)
    if (this.isActive()) {
      try {
        this.close()
      } catch (error) {
        this.log("Failed to reopen WebSocket", error)
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
    return this.isState("open")
  }

  isActive = (): boolean => {
    return this.isState("open", "connecting")
  }

  // Private

  isProtocolSupported = (): boolean => {
    return supportedProtocols.indexOf(this.getProtocol()) !== -1
  }

  isState = (...states: string[]): boolean => {
    return states.indexOf(this.getState()) !== -1
  }

  getState = (): string | null => {
    if (this.webSocket?.readyState != null) {
      const ws = (globalThis as any).WebSocket || {}
      const entries = Object.keys(ws).map(key => [key, ws[key]])
      for (const [state, value] of entries) {
        if (value === this.webSocket.readyState) {
          return state.toLowerCase()
        }
      }
    }
    return null
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

      const { identifier, message, type } = JSON.parse(event.data)
      if (event.data.close) {
        event.data.close()
      }

      switch (type) {
        case message_types.welcome:
          this.monitor.recordConnect()
          this.subscriptions.reload()
          break
        case message_types.ping:
          this.monitor.recordPing()
          break
        case message_types.confirmation:
          this.subscriptions.notify(identifier, "connected")
          break
        case message_types.rejection:
          this.subscriptions.reject(identifier)
          break
        default:
          this.subscriptions.notify(identifier, "received", message)
      }
    },

    open: (): void => {
      this.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`)
      this.disconnected = false
      if (!this.isProtocolSupported()) {
        this.log("Protocol is unsupported. Stopping monitor and disconnecting.")
        this.close({ allowReconnect: false })
      }
    },

    close: (event: any): void => {
      this.log("WebSocket onclose event")
      if (this.disconnected) return
      this.disconnected = true
      this.monitor.recordDisconnect()
      this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() })
    },

    error: (event: any): void => {
      this.log("WebSocket onerror event")
      this.subscriptions.notifyAll("error", event)
    }
  }
}

export default Connection