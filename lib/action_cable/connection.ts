import INTERNAL from './internal';
import ConnectionMonitor from './connection_monitor';

const { message_types, protocols } = INTERNAL;

const [supportedProtocols, unsupportedProtocol] = protocols.slice(0, -1).concat([protocols[protocols.length - 1]]);

interface Consumer {
  url: string;
  headers: any;
  subscriptions: {
    reload: () => void;
    notify: (identifier: string, callbackName: string, ...args: any[]) => void;
    reject: (identifier: string) => void;
    notifyAll: (callbackName: string, ...args: any[]) => void;
  };
}

type LogFunction = (...args: any[]) => void;
type WebSocketConstructor = any;

class Connection {
  static reopenDelay = 500;

  private consumer: Consumer;
  private log: LogFunction;
  private WebSocket: WebSocketConstructor;
  private subscriptions: Consumer['subscriptions'];
  private monitor: any;
  private disconnected: boolean = true;
  private webSocket?: any;

  constructor(consumer: Consumer, log: LogFunction, WebSocketClass: WebSocketConstructor) {
    this.consumer = consumer;
    this.log = log;
    this.WebSocket = WebSocketClass;
    this.subscriptions = consumer.subscriptions;
    this.monitor = new ConnectionMonitor(this, log);
  }

  send = (data: any) => {
    if (this.isOpen()) {
      this.webSocket.send(JSON.stringify(data));
      return true;
    } else {
      return false;
    }
  }

  open = () => {
    if (this.isActive()) {
      this.log(`Attempted to open WebSocket, but existing socket is ${this.getState()}`);
      return false;
    } else {
      this.log(`Opening WebSocket, current state is ${this.getState()}, subprotocols: ${protocols}`);
      if (this.webSocket) {
        this.uninstallEventHandlers();
      }
      this.webSocket = new this.WebSocket(this.consumer.url, protocols, { headers: this.consumer.headers });
      this.installEventHandlers();
      this.monitor.start();
      return true;
    }
  }

  close = ({ allowReconnect = true } = {}) => {
    if (!allowReconnect) {
      this.monitor.stop();
    }
    if (this.webSocket && this.isActive()) {
      this.webSocket.close();
    }
  }

  reopen = () => {
    this.log(`Reopening WebSocket, current state is ${this.getState()}`);
    if (this.isActive()) {
      try {
        this.close();
      } catch (error) {
        this.log("Failed to reopen WebSocket", error);
      } finally {
        this.log(`Reopening WebSocket in ${Connection.reopenDelay}ms`);
        setTimeout(this.open, Connection.reopenDelay);
      }
    } else {
      this.open();
    }
  }

  getProtocol = () => {
    return this.webSocket?.protocol;
  }

  isOpen = () => {
    return this.isState("open");
  }

  isActive = () => {
    return this.isState("open", "connecting");
  }

  // Private

  private isProtocolSupported = () => {
    return supportedProtocols.includes(this.getProtocol());
  }

  private isState = (...states: string[]) => {
    return states.includes(this.getState());
  }

  private getState = () => {
    if (this.webSocket?.readyState != null) {
      for (const [state, value] of Object.entries((globalThis as any).WebSocket || {})) {
        if (value === this.webSocket.readyState) {
          return state.toLowerCase();
        }
      }
    }
    return null;
  }

  private installEventHandlers = () => {
    for (const eventName of Object.keys(this.events)) {
      const handler = (this.events as any)[eventName].bind(this);
      this.webSocket[`on${eventName}`] = handler;
    }
  }

  private uninstallEventHandlers = () => {
    for (const eventName of Object.keys(this.events)) {
      this.webSocket[`on${eventName}`] = () => {};
    }
  }

  private events = {
    message: (event: any) => {
      if (!this.isProtocolSupported()) {
        if (event.data.close) {
          event.data.close();
        }
        return;
      }

      const { identifier, message, type } = JSON.parse(event.data);
      if (event.data.close) {
        event.data.close();
      }

      switch (type) {
        case message_types.welcome:
          this.monitor.recordConnect();
          this.subscriptions.reload();
          break;
        case message_types.ping:
          this.monitor.recordPing();
          break;
        case message_types.confirmation:
          this.subscriptions.notify(identifier, "connected");
          break;
        case message_types.rejection:
          this.subscriptions.reject(identifier);
          break;
        default:
          this.subscriptions.notify(identifier, "received", message);
      }
    },

    open: () => {
      this.log(`WebSocket onopen event, using '${this.getProtocol()}' subprotocol`);
      this.disconnected = false;
      if (!this.isProtocolSupported()) {
        this.log("Protocol is unsupported. Stopping monitor and disconnecting.");
        this.close({ allowReconnect: false });
      }
    },

    close: (event: any) => {
      this.log("WebSocket onclose event");
      if (this.disconnected) return;
      this.disconnected = true;
      this.monitor.recordDisconnect();
      this.subscriptions.notifyAll("disconnected", { willAttemptReconnect: this.monitor.isRunning() });
    },

    error: (event: any) => {
      this.log("WebSocket onerror event");
      this.subscriptions.notifyAll("error", event);
    }
  };
}

export default Connection;