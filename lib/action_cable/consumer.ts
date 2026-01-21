import Connection from './connection'
import Subscriptions from './subscriptions'
import type { Consumer as ConsumerInterface } from './subscriptions'

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

  constructor(url: UrlProvider, log: LogFunction, WebSocketClass: WebSocketConstructor, headers: HeadersProvider = {}) {
    this._url = url
    this._headers = headers
    this.log = log
    this.WebSocket = WebSocketClass
    this.subscriptions = new Subscriptions(this)
    this.connection = new Connection(this, log, WebSocketClass)
  }

  get url(): string {
    return this.createWebSocketURL(this._url)
  }

  get headers(): any {
    return this.createHeaders(this._headers)
  }

  send = (data: any): void => {
    this.connection.send(data)
  }

  connect = (): void => {
    this.connection.open()
  }

  disconnect = (): void => {
    this.connection.close({ allowReconnect: false })
  }

  ensureActiveConnection = (): void => {
    if (!this.connection.isActive()) {
      this.connection.open()
    }
  }

  createWebSocketURL(url: UrlProvider): string {
    const resolvedUrl = typeof url === 'function' ? url() : url

    if (resolvedUrl && !/^wss?:/i.test(resolvedUrl)) {
      return resolvedUrl.replace('http', 'ws')
    }

    return resolvedUrl
  }

  createHeaders(headers: HeadersProvider): any {
    return typeof headers === 'function' ? headers() : headers
  }
}

export default Consumer
