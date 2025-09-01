const Connection = require('./connection')
const Subscriptions = require('./subscriptions')

/**
 * @typedef {function(...any): void} LogFunction
 */

/**
 * @typedef {any} WebSocketConstructor
 */

/**
 * @typedef {function(): any | any} HeadersProvider
 */

/**
 * @typedef {function(): string | string} UrlProvider
 */

class Consumer {
  /**
   * @param {UrlProvider} url
   * @param {LogFunction} log
   * @param {WebSocketConstructor} WebSocketClass
   * @param {HeadersProvider} headers
   */
  constructor(url, log, WebSocketClass, headers = {}) {
    /** @type {UrlProvider} */
    this._url = url
    /** @type {HeadersProvider} */
    this._headers = headers
    /** @type {LogFunction} */
    this.log = log
    /** @type {WebSocketConstructor} */
    this.WebSocket = WebSocketClass
    /** @type {any} */
    this.subscriptions = new Subscriptions(this)
    /** @type {any} */
    this.connection = new Connection(this, log, WebSocketClass)
  }

  /**
   * @returns {string}
   */
  get url() {
    return this.createWebSocketURL(this._url)
  }

  /**
   * @returns {any}
   */
  get headers() {
    return this.createHeaders(this._headers)
  }

  /**
   * @param {any} data
   */
  send = (data) => {
    this.connection.send(data)
  }

  connect = () => {
    this.connection.open()
  }

  disconnect = () => {
    this.connection.close({ allowReconnect: false })
  }

  ensureActiveConnection = () => {
    if (!this.connection.isActive()) {
      this.connection.open()
    }
  }

  /**
   * @param {UrlProvider} url
   * @returns {string}
   */
  createWebSocketURL(url) {
    const resolvedUrl = typeof url === 'function' ? url() : url

    if (resolvedUrl && !/^wss?:/i.test(resolvedUrl)) {
      return resolvedUrl.replace('http', 'ws')
    }

    return resolvedUrl
  }

  /**
   * @param {HeadersProvider} headers
   * @returns {any}
   */
  createHeaders(headers) {
    return typeof headers === 'function' ? headers() : headers
  }
}

module.exports = Consumer