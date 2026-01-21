import Consumer from './consumer'
import INTERNAL from './internal'

// Declare global for Node.js compatibility
declare const global: any

export type LogFunction = (...args: any[]) => void

export type HeadersProvider = (() => any) | any

export type UrlProvider = (() => string) | string

interface ActionCableInterface {
  INTERNAL: typeof INTERNAL
  WebSocket: any
  logger: any
  debugging: boolean | null
  _consumers: Record<string, Consumer>

  createConsumer(url: UrlProvider, headers?: HeadersProvider): Consumer
  getOrCreateConsumer(url: UrlProvider, headers?: HeadersProvider): Consumer
  disconnectConsumer(url: UrlProvider, headers?: HeadersProvider): boolean
  _createCacheKey(url: UrlProvider, headers: HeadersProvider): string
  startDebugging(): void
  stopDebugging(): void
  log(...messages: any[]): void
}

const ActionCable: ActionCableInterface = {
  INTERNAL: INTERNAL,
  WebSocket: (typeof window !== 'undefined' && (window as any).WebSocket)
    ? (window as any).WebSocket
    : (typeof global !== 'undefined' && global.WebSocket)
      ? global.WebSocket
      : (globalThis as any).WebSocket,
  logger: (typeof window !== 'undefined' && (window as any).console)
    ? (window as any).console
    : (typeof global !== 'undefined' && global.console)
      ? global.console
      : console,
  debugging: false,
  _consumers: {},

  createConsumer(url: UrlProvider, headers: HeadersProvider = {}): Consumer {
    return new Consumer(url, this.log, this.WebSocket, headers)
  },

  getOrCreateConsumer(url: UrlProvider, headers: HeadersProvider = {}): Consumer {
    // Create a cache key based on URL and headers
    const cacheKey = this._createCacheKey(url, headers)

    // Return existing consumer if it exists and is active
    if (this._consumers[cacheKey]?.connection.isActive()) {
      this.log('Reusing existing consumer for', url)
      return this._consumers[cacheKey]
    }

    // Clean up disconnected consumer if exists
    if (this._consumers[cacheKey] && !this._consumers[cacheKey].connection.isActive()) {
      this.log('Cleaning up disconnected consumer for', url)
      this._consumers[cacheKey].disconnect()
      delete this._consumers[cacheKey]
    }

    // Create new consumer and cache it
    this.log('Creating new consumer for', url)
    const consumer = new Consumer(url, this.log, this.WebSocket, headers)
    this._consumers[cacheKey] = consumer
    return consumer
  },

  disconnectConsumer(url: UrlProvider, headers: HeadersProvider = {}): boolean {
    const cacheKey = this._createCacheKey(url, headers)
    if (this._consumers[cacheKey]) {
      this._consumers[cacheKey].disconnect()
      delete this._consumers[cacheKey]
      this.log('Disconnected consumer for', url)
      return true
    } else {
      return false
    }
  },

  _createCacheKey(url: UrlProvider, headers: HeadersProvider): string {
    // Create URL string (handle function case)
    const urlStr = typeof url === 'function' ? url() : url
    // Create headers string (handle function case)
    const headersStr = JSON.stringify(typeof headers === 'function' ? headers() : headers)
    return `${urlStr}|${headersStr}`
  },

  startDebugging(): void {
    this.debugging = true
  },

  stopDebugging(): void {
    this.debugging = null
  },

  log(...messages: any[]): void {
    if (ActionCable.debugging) {
      messages.push(Date.now())
      ActionCable.logger.log('[ActionCable]', ...messages)
    }
  },
}

export default ActionCable
