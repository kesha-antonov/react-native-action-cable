const Connection = require('./connection')
const Subscriptions = require('./subscriptions')

class Consumer {
  constructor(url, log, WebSocketClass, headers = {}) {
    this._url = url
    this._headers = headers
    this.log = log
    this.WebSocket = WebSocketClass
    this.subscriptions = new Subscriptions(this)
    this.connection = new Connection(this, log, WebSocketClass)
  }

  get url() {
    return this.createWebSocketURL(this._url)
  }

  get headers() {
    return this.createHeaders(this._headers)
  }

  send(data) {
    this.connection.send(data)
  }

  connect() {
    this.connection.open()
  }

  disconnect() {
    this.connection.close({ allowReconnect: false })
  }

  ensureActiveConnection() {
    if (!this.connection.isActive()) {
      this.connection.open()
    }
  }

  createWebSocketURL(url) {
    const resolvedUrl = typeof url === 'function' ? url() : url

    if (resolvedUrl && !/^wss?:/i.test(resolvedUrl)) {
      return resolvedUrl.replace('http', 'ws')
    }

    return resolvedUrl
  }

  createHeaders(headers) {
    return typeof headers === 'function' ? headers() : headers
  }
}

module.exports = Consumer