const Consumer = require('./consumer')
const INTERNAL = require('./internal')

/**
 * @typedef {function(...any): void} LogFunction
 */

/**
 * @typedef {function(): any | any} HeadersProvider
 */

/**
 * @typedef {function(): string | string} UrlProvider
 */

const ActionCable = {
  INTERNAL: INTERNAL,
  WebSocket: (typeof window !== 'undefined' && window.WebSocket) 
    ? window.WebSocket 
    : (typeof global !== 'undefined' && global.WebSocket) 
      ? global.WebSocket 
      : globalThis.WebSocket,
  logger: (typeof window !== 'undefined' && window.console) 
    ? window.console 
    : (typeof global !== 'undefined' && global.console) 
      ? global.console 
      : console,
  /** @type {boolean | null} */
  debugging: false,
  /** @type {Record<string, any>} */
  _consumers: {},

  /**
   * @param {UrlProvider} url
   * @param {HeadersProvider} headers
   * @returns {any}
   */
  createConsumer(url, headers = {}) {
    return new Consumer(url, this.log, this.WebSocket, headers)
  },

  /**
   * @param {UrlProvider} url
   * @param {HeadersProvider} headers
   * @returns {any}
   */
  getOrCreateConsumer(url, headers = {}) {
    // Create a cache key based on URL and headers
    const cacheKey = this._createCacheKey(url, headers)
    
    // Return existing consumer if it exists and is active
    if (this._consumers[cacheKey]?.connection.isActive()) {
      this.log("Reusing existing consumer for", url)
      return this._consumers[cacheKey]
    }
    
    // Clean up disconnected consumer if exists
    if (this._consumers[cacheKey] && !this._consumers[cacheKey].connection.isActive()) {
      this.log("Cleaning up disconnected consumer for", url)
      this._consumers[cacheKey].disconnect()
      delete this._consumers[cacheKey]
    }
    
    // Create new consumer and cache it
    this.log("Creating new consumer for", url)
    const consumer = new Consumer(url, this.log, this.WebSocket, headers)
    this._consumers[cacheKey] = consumer
    return consumer
  },

  /**
   * @param {UrlProvider} url
   * @param {HeadersProvider} headers
   * @returns {boolean}
   */
  disconnectConsumer(url, headers = {}) {
    const cacheKey = this._createCacheKey(url, headers)
    if (this._consumers[cacheKey]) {
      this._consumers[cacheKey].disconnect()
      delete this._consumers[cacheKey]
      this.log("Disconnected consumer for", url)
      return true
    } else {
      return false
    }
  },

  /**
   * @param {UrlProvider} url
   * @param {HeadersProvider} headers
   * @returns {string}
   */
  _createCacheKey(url, headers) {
    // Create URL string (handle function case)
    const urlStr = typeof url === 'function' ? url() : url
    // Create headers string (handle function case)  
    const headersStr = JSON.stringify(typeof headers === 'function' ? headers() : headers)
    return `${urlStr}|${headersStr}`
  },

  startDebugging() {
    this.debugging = true
  },

  stopDebugging() {
    this.debugging = null
  },

  /**
   * @param {...any} messages
   */
  log(...messages) {
    if (ActionCable.debugging) {
      messages.push(Date.now())
      ActionCable.logger.log("[ActionCable]", ...messages)
    }
  }
}

module.exports = ActionCable