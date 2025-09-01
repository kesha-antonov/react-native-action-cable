import Connection from './connection';
import Subscriptions from './subscriptions';

type LogFunction = (...args: any[]) => void;
type WebSocketConstructor = any;
type HeadersProvider = (() => any) | any;
type UrlProvider = (() => string) | string;

class Consumer {
  private log: LogFunction;
  private WebSocket: WebSocketConstructor;
  public subscriptions: any;
  public connection: any;
  private _url: UrlProvider;
  private _headers: HeadersProvider;

  constructor(url: UrlProvider, log: LogFunction, WebSocketClass: WebSocketConstructor, headers: HeadersProvider = {}) {
    this._url = url;
    this._headers = headers;
    this.log = log;
    this.WebSocket = WebSocketClass;
    this.subscriptions = new Subscriptions(this);
    this.connection = new Connection(this, log, WebSocketClass);
  }

  get url(): string {
    return this.createWebSocketURL(this._url);
  }

  get headers(): any {
    return this.createHeaders(this._headers);
  }

  send = (data: any) => {
    this.connection.send(data);
  }

  connect = () => {
    this.connection.open();
  }

  disconnect = () => {
    this.connection.close({ allowReconnect: false });
  }

  ensureActiveConnection = () => {
    if (!this.connection.isActive()) {
      this.connection.open();
    }
  }

  private createWebSocketURL(url: UrlProvider): string {
    const resolvedUrl = typeof url === 'function' ? url() : url;

    if (resolvedUrl && !/^wss?:/i.test(resolvedUrl)) {
      return resolvedUrl.replace('http', 'ws');
    }

    return resolvedUrl;
  }

  private createHeaders(headers: HeadersProvider): any {
    return typeof headers === 'function' ? headers() : headers;
  }
}

export default Consumer;