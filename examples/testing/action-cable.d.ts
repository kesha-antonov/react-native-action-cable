declare module '@kesha-antonov/react-native-action-cable' {
  import { EventEmitter } from 'eventemitter3'

  export type LogFunction = (...args: any[]) => void
  export type HeadersProvider = (() => any) | any
  export type UrlProvider = (() => string) | string

  export interface Consumer {
    subscriptions: Subscriptions
    connection: Connection
    connect(): void
    disconnect(): void
    send(data: object): boolean
  }

  export interface Connection {
    isActive(): boolean
    isOpen?(): boolean
  }

  export interface Subscriptions {
    create<T extends object>(
      channelName: string | object,
      mixin?: Partial<SubscriptionCallbacks<T>>
    ): Subscription
  }

  export interface SubscriptionCallbacks<T extends object = object> {
    received?: (data: T) => void
    initialized?: () => void
    connected?: () => void
    disconnected?: () => void
    rejected?: () => void
  }

  export interface Subscription extends EventEmitter {
    identifier: string
    perform(action: string, data?: object): void
    send(data: object): void
    unsubscribe(): void
    connected(): void
    disconnected(): void
    rejected(): void
    error(error: any): void
    received(data?: object): void
  }

  export interface ActionCableInterface {
    INTERNAL?: object
    WebSocket: any
    logger: any
    debugging: boolean | null
    _consumers: Record<string, Consumer>
    createConsumer(url: UrlProvider, headers?: HeadersProvider): Consumer
    getOrCreateConsumer(url: UrlProvider, headers?: HeadersProvider): Consumer
    disconnectConsumer(url: UrlProvider, headers?: HeadersProvider): boolean
    startDebugging(): void
    stopDebugging(): void
    log(...messages: any[]): void
  }

  export const ActionCable: ActionCableInterface

  export interface Channels {
    [key: string]: Subscription
  }

  export class Cable {
    channels: Channels
    constructor(channels?: Channels)
    channel(name: string): Subscription | undefined
    setChannel(name: string, channel: Subscription): Subscription
  }
}
