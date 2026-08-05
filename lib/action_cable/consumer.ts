import Connection from './connection'
import Subscriptions from './subscriptions'
import type { Consumer as ConsumerInterface } from './subscriptions'
import { log as defaultLog } from './internal'

export type LogFunction = (...args: any[]) => void

export type WebSocketConstructor = any

export type HeadersProvider = (() => any) | any

export type UrlProvider = (() => string) | string

class Consumer implements ConsumerInterface {
  private _url: UrlProvider
  private _headers: HeadersProvider
  log: LogFunction
  WebSocket: WebSocketConstructor
  subscriptions: Subscriptions
  connection: Connection
  subprotocols: string[] = []

  constructor(url: UrlProvider, log: LogFunction, WebSocketClass: WebSocketConstructor, headers: HeadersProvider = {}) {
    this._url = url
    this._headers = headers
    this.log = log || defaultLog
    this.WebSocket = WebSocketClass
    this.subscriptions = new Subscriptions(this, this.log)
    this.connection = new Connection(this, this.log, WebSocketClass)
  }

  get url(): string {
    return this.createWebSocketURL(this._url)
  }

  get headers(): any {
    return this.createHeaders(this._headers)
  }

  send = (data: any): boolean => {
    return this.connection.send(data)
  }

  connect = (): boolean => {
    return this.connection.open()
  }

  disconnect = (): void => {
    this.connection.close({ allowReconnect: false })
  }

  ensureActiveConnection = (): void => {
    if (!this.connection.isActive()) {
      this.connection.open()
    }
  }

  addSubProtocol = (subprotocol: string): void => {
    this.subprotocols = [...this.subprotocols, subprotocol]
  }

  createWebSocketURL(url: UrlProvider): string {
    return createWebSocketURL(url)
  }

  createHeaders(headers: HeadersProvider): any {
    return createHeaders(headers)
  }
}

/**
 * Resolves a url (or url function) to a WebSocket url.
 *
 * Rails resolves relative urls through `document.createElement('a')`; there is
 * no document in React Native, so the scheme is rewritten directly and the url
 * is expected to be absolute.
 */
export function createWebSocketURL(url: UrlProvider): string {
  const resolvedUrl = typeof url === 'function' ? url() : url

  // Only rewrite the scheme - a plain `replace('http', 'ws')` would also
  // mangle the first "http" occurring anywhere else in the URL
  if (resolvedUrl && !/^wss?:/i.test(resolvedUrl)) {
    return resolvedUrl.replace(/^http(s?):/i, (_match, secure: string) => (secure ? 'wss:' : 'ws:'))
  }

  return resolvedUrl
}

export function createHeaders(headers: HeadersProvider): any {
  return typeof headers === 'function' ? headers() : headers
}

export default Consumer
