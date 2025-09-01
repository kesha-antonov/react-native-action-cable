const INTERNAL = require('./internal')
const ConnectionMonitor = require('./connection_monitor')

const { message_types, protocols } = INTERNAL

const [supportedProtocols, unsupportedProtocol] = protocols.slice(0, -1).concat([protocols[protocols.length - 1]])

/**
 * @typedef {Object} Consumer
 * @property {string} url
 * @property {any} headers
 * @property {Object} subscriptions
 * @property {function(): void} subscriptions.reload
 * @property {function(string, string, ...any): void} subscriptions.notify
 * @property {function(string): void} subscriptions.reject
 * @property {function(string, ...any): void} subscriptions.notifyAll
 */

/**
 * @typedef {function(...any): void} LogFunction
 */

/**
 * @typedef {any} WebSocketConstructor
 */

class Connection {
  static reopenDelay = 500

  /**
   * @param {Consumer} consumer
   * @param {LogFunction} log
   * @param {WebSocketConstructor} WebSocketClass
   */
  constructor(consumer, log, WebSocketClass) {
    /** @type {Consumer} */
    this.consumer = consumer
    /** @type {LogFunction} */
    this.log = log
    /** @type {WebSocketConstructor} */
    this.WebSocket = WebSocketClass
    /** @type {Consumer['subscriptions']} */
    this.subscriptions = consumer.subscriptions
    /** @type {any} */
    this.monitor = new ConnectionMonitor(this, log)
    /** @type {boolean} */
    this.disconnected = true
    /** @type {any} */
    this.webSocket = undefined
  }

  /**
   * @param {any} data
   * @returns {boolean}
   */
  send = (data) => {
    if (this.isOpen()) {
      this.webSocket.send(JSON.stringify(data))
      return true
    } else {
      return false
    }
  }

  /**
   * @returns {boolean}
   */
  open = () => {
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

  /**
   * @param {Object} options
   * @param {boolean} options.allowReconnect
   */
  close = ({ allowReconnect = true } = {}) => {
    if (!allowReconnect) {
      this.monitor.stop()
    }
    if (this.webSocket && this.isActive()) {
      this.webSocket.close()
    }
  }

  reopen = () => {
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

  /**
   * @returns {any}
   */
  getProtocol = () => {
    return this.webSocket?.protocol
  }

  /**
   * @returns {boolean}
   */
  isOpen = () => {
    return this.isState("open")
  }

  /**
   * @returns {boolean}
   */
  isActive = () => {
    return this.isState("open", "connecting")
  }

  // Private

  /**
   * @returns {boolean}
   */
  isProtocolSupported = () => {
    return supportedProtocols.includes(this.getProtocol())
  }

  /**
   * @param {...string} states
   * @returns {boolean}
   */
  isState = (...states) => {
    return states.includes(this.getState())
  }

  /**
   * @returns {string | null}
   */
  getState = () => {
    if (this.webSocket?.readyState != null) {
      for (const [state, value] of Object.entries((globalThis).WebSocket || {})) {
        if (value === this.webSocket.readyState) {
          return state.toLowerCase()
        }
      }
    }
    return null
  }

  installEventHandlers = () => {
    for (const eventName of Object.keys(this.events)) {
      const handler = this.events[eventName].bind(this)
      this.webSocket[`on${eventName}`] = handler
    }
  }

  uninstallEventHandlers = () => {
    for (const eventName of Object.keys(this.events)) {
      this.webSocket[`on${eventName}`] = () => {}
    }
  }

  events = {
    /**
     * @param {any} event
     */
    message: (event) => {
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

    open: () => {
      this.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`)
      this.disconnected = false
      if (!this.isProtocolSupported()) {
        this.log("Protocol is unsupported. Stopping monitor and disconnecting.")
        this.close({ allowReconnect: false })
      }
    },

    /**
     * @param {any} event
     */
    close: (event) => {
      this.log("WebSocket onclose event")
      if (this.disconnected) return
      this.disconnected = true
      this.monitor.recordDisconnect()
      this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() })
    },

    /**
     * @param {any} event
     */
    error: (event) => {
      this.log("WebSocket onerror event")
      this.subscriptions.notifyAll("error", event)
    }
  }
}

module.exports = Connection