import EventEmitter from 'eventemitter3'

export interface SubscriptionParams {
  [key: string]: any
}

export interface SubscriptionConsumer {
  send(data: any): void
  subscriptions: {
    remove(subscription: Subscription): void
  }
}

export interface ConnectedPayload {
  reconnected: boolean
}

export interface DisconnectedPayload {
  willAttemptReconnect: boolean
}

/**
 * Callbacks copied onto the subscription, the way Rails ActionCable defines
 * them. Handy when porting Rails code over; the event emitter API
 * (`subscription.on('received', ...)`) is the idiomatic alternative.
 */
export interface SubscriptionMixin {
  [key: string]: any
}

function extend<T extends object>(object: T, properties?: SubscriptionMixin): T {
  if (properties != null) {
    for (const key in properties) {
      ;(object as Record<string, any>)[key] = properties[key]
    }
  }
  return object
}

class Subscription extends EventEmitter {
  consumer: SubscriptionConsumer
  identifier: string

  constructor(consumer: SubscriptionConsumer, params: SubscriptionParams = {}, mixin?: SubscriptionMixin) {
    super()
    this.consumer = consumer
    this.identifier = JSON.stringify(params)
    extend(this, mixin)
  }

  // NOTE: PERFORM A CHANNEL ACTION WITH THE OPTIONAL DATA PASSED AS AN ATTRIBUTE
  perform = (action: string, data: any = {}): void => {
    // Copy instead of mutating: the caller's object may be frozen or reused
    this.send({ ...data, action })
  }

  send = (data: any): void => {
    this.consumer.send({
      command: 'message',
      identifier: this.identifier,
      data: JSON.stringify(data),
    })
  }

  unsubscribe = (): void => {
    this.consumer.subscriptions.remove(this)
  }

  connected = (payload?: ConnectedPayload): void => {
    this.emit('connected', payload)
  }

  disconnected = (payload?: DisconnectedPayload): void => {
    this.emit('disconnected', payload)
  }

  rejected = (): void => {
    this.emit('rejected')
  }

  error = (error: any): void => {
    this.emit('error', error)
  }

  received = (data: any): void => {
    // A message can be anything the server broadcasts: a string, an array or
    // nothing at all. Only plain objects can carry an action.
    if (data != null && (typeof data !== 'object' || Array.isArray(data))) {
      this.emit('received', data)
      return
    }

    const message = data ?? {}
    const action = message.action != null ? message.action : 'received'
    this.emit(action, { ...message, action })
  }
}

export default Subscription
