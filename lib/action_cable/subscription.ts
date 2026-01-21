const EventEmitter = eval('require')('eventemitter3')

export interface SubscriptionParams {
  [key: string]: any
}

export interface SubscriptionConsumer {
  send(data: any): void
  subscriptions: {
    remove(subscription: Subscription): void
  }
}

class Subscription extends EventEmitter {
  consumer: SubscriptionConsumer
  identifier: string

  constructor(consumer: SubscriptionConsumer, params: SubscriptionParams = {}) {
    super()
    this.consumer = consumer
    this.identifier = JSON.stringify(params)
  }

  // NOTE: PERFORM A CHANNEL ACTION WITH THE OPTIONAL DATA PASSED AS AN ATTRIBUTE
  perform = (action: string, data: any = {}): void => {
    data.action = action
    this.send(data)
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

  connected = (): void => {
    this.emit('connected')
  }

  disconnected = (): void => {
    this.emit('disconnected')
  }

  rejected = (): void => {
    this.emit('rejected')
  }

  error = (error: any): void => {
    this.emit('error', error)
  }

  received = (data: any = {}): void => {
    data.action = data.action != null ? data.action : 'received'
    this.emit(data.action, data)
  }
}

export default Subscription
