import EventEmitter from 'eventemitter3';

interface IActionCable {
  createConsumer: (url: string) => IConsumer;
  startDebugging: () => void;
  stopDebugging: () => void;
  log: (messages: string[]) => void;
}
interface IConsumer {
  subscriptions: ISubscriptions;
  connection: IConnection;

  send: (data: any) => void;
  connect: () => void;
  disconnect: () => void;
  ensureActiveConnection: () => void;
  createWebSocketURL: (url: string) => void;
}
interface ISubscriptions {
  new (consumer: IConsumer): ISubscriptions;

  consumer: IConsumer;
  subscriptions: ISubscription[];

  create: (channel: string | {channel: string}) => ISubscription;
  add: (subscription: ISubscriptions) => ISubscription;
  remove: (subscription: ISubscription) => ISubscription;
  reject: (identifier: string) => ISubscription;
  forget: (subscription: ISubscription) => ISubscription;
  findAll: (identifier: string) => ISubscription[];
  reload: () => void;
  notifyAll: (callbackName: string, ...args: any[]) => void;
  notify: (
    subscription: ISubscription,
    callbackName: string,
    ...args: any[]
  ) => void;
  sendCommand: (subscription: ISubscription, command: string) => void;
}
interface ISubscription extends EventEmitter {
  new (consumer: IConsumer, params?: any): ISubscriptions;

  identifier: string;

  perform: (action: string, data?: any) => void;
  send: (data: any) => void;
  unsubscribe: () => void;
  connected: () => void;
  disconnected: () => void;
  rejected: () => void;
  received: (data: any) => void;
}
interface IConnection {
  reopenDelay: number;

  send: (data: any) => void;
  open: () => void;
  close: (params?: {allowReconnect: boolean}) => void;
  reopen: () => void;
  getProtocol: () => any;
  isOpen: () => boolean;
  isActive: () => boolean;
}
interface ICable {
  new (channels: Record<string, ISubscription>): ICable;

  channels: Record<string, ISubscription>;

  channel: (name: string) => ISubscription | undefined;
  setChannel: (name: string, channel: ISubscription) => ISubscription;
}
export const ActionCable: IActionCable;
export const Cable: ICable;
