const INTERNAL = require('./internal')
const ConnectionMonitor = require('./connection_monitor')

const { message_types, protocols } = INTERNAL

const supportedProtocols = protocols.slice(0, -1)

class Connection {
  constructor(consumer, log, WebSocketClass) {
    this.consumer = consumer
    this.log = log
    this.WebSocket = WebSocketClass
    this.subscriptions = consumer.subscriptions
    this.monitor = new ConnectionMonitor(this, log)
    this.disconnected = true
  }

  send(data) {
    if (this.isOpen()) {
      this.webSocket.send(JSON.stringify(data))
      return true
    } else {
      return false
    }
  }

  open() {
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

  close({ allowReconnect = true } = {}) {
    if (!allowReconnect) {
      this.monitor.stop()
    }
    if (this.webSocket && this.isActive()) {
      this.webSocket.close()
    }
  }

  reopen() {
    this.log(`Reopening WebSocket, current state is ${this.getState()}`)
    if (this.isActive()) {
      try {
        this.close()
      } catch (error) {
        this.log("Failed to reopen WebSocket", error)
      } finally {
        this.log(`Reopening WebSocket in ${Connection.reopenDelay}ms`)
        setTimeout(this.open.bind(this), Connection.reopenDelay)
      }
    } else {
      this.open()
    }
  }

  getProtocol() {
    return this.webSocket && this.webSocket.protocol
  }

  isOpen() {
    return this.isState("open")
  }

  isActive() {
    return this.isState("open", "connecting")
  }

  // Private

  isProtocolSupported() {
    return supportedProtocols.includes(this.getProtocol())
  }

  isState(...states) {
    return states.includes(this.getState())
  }

  getState() {
    if (this.webSocket && this.webSocket.readyState != null) {
      for (const [state, value] of Object.entries(globalThis.WebSocket || {})) {
        if (value === this.webSocket.readyState) {
          return state.toLowerCase()
        }
      }
    }
    return null
  }

  installEventHandlers() {
    for (const eventName of Object.keys(this.events)) {
      const handler = this.events[eventName].bind(this)
      this.webSocket[`on${eventName}`] = handler
    }
  }

  uninstallEventHandlers() {
    for (const eventName of Object.keys(this.events)) {
      this.webSocket[`on${eventName}`] = () => {}
    }
  }
}

Connection.reopenDelay = 500

// Define events as a property after class definition
Connection.prototype.events = {
  message: function(event) {
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

  open: function() {
    this.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`)
    this.disconnected = false
    if (!this.isProtocolSupported()) {
      this.log("Protocol is unsupported. Stopping monitor and disconnecting.")
      this.close({ allowReconnect: false })
    }
  },

  close: function() {
    this.log("WebSocket onclose event")
    if (this.disconnected) return
    this.disconnected = true
    this.monitor.recordDisconnect()
    this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() })
  },

  error: function(event) {
    this.log("WebSocket onerror event")
    this.subscriptions.notifyAll("error", event)
  }
}

module.exports = Connection