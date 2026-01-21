declare module '@kesha-antonov/react-native-action-cable' {
  export interface Consumer {
    subscriptions: {
      create: (params: Record<string, unknown>) => Subscription
    }
    connection: {
      isOpen: () => boolean
      isActive: () => boolean
    }
    connect: () => void
    disconnect: () => void
  }

  export interface Subscription {
    on: (event: string, callback: (data?: unknown) => void) => Subscription
    removeListener: (event: string, callback: (data?: unknown) => void) => Subscription
    perform: (action: string, data: Record<string, unknown>) => void
    unsubscribe: () => void
  }

  export const ActionCable: {
    createConsumer: (url: string, headers?: Record<string, string> | (() => Record<string, string>)) => Consumer
    getOrCreateConsumer: (url: string, headers?: Record<string, string> | (() => Record<string, string>)) => Consumer
    disconnectConsumer: (url: string) => boolean
    startDebugging: () => void
    stopDebugging: () => void
    log: (...args: unknown[]) => void
    INTERNAL: Record<string, unknown>
  }

  export class Cable {
    constructor(channels?: Record<string, unknown>)
    channels: Record<string, Subscription>
    channel: (name: string) => Subscription | undefined
    setChannel: (name: string, subscription: Subscription) => Subscription
  }
}
