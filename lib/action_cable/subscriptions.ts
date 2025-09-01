import INTERNAL from './internal'
import Subscription from './subscription'

export interface ChannelParams {
  channel: string
  [key: string]: any
}

export interface SubscriptionConsumer {
  send(data: any): void
  subscriptions: {
    remove(subscription: Subscription): void
  }
}

export interface Consumer extends SubscriptionConsumer {
  ensureActiveConnection(): void
}

class Subscriptions {
  consumer: Consumer
  subscriptions: Subscription[] = []

  constructor(consumer: Consumer) {
    this.consumer = consumer
  }

  create = (channelName: string | ChannelParams): Subscription => {
    const channel = channelName
    const params = typeof channel === 'object' ? channel : { channel }
    const subscription = new Subscription(this.consumer, params)
    return this.add(subscription)
  }

  // Private

  add = (subscription: Subscription): Subscription => {
    this.subscriptions.push(subscription)
    this.consumer.ensureActiveConnection()
    this.notify(subscription, "initialized")
    this.sendCommand(subscription, "subscribe")
    return subscription
  }

  remove = (subscription: Subscription): Subscription => {
    this.forget(subscription)
    if (!this.findAll(subscription.identifier).length) {
      this.sendCommand(subscription, "unsubscribe")
    }
    return subscription
  }

  reject = (identifier: string): Subscription[] => {
    const subscriptions = this.findAll(identifier)
    for (const subscription of subscriptions) {
      this.forget(subscription)
      this.notify(subscription, "rejected")
    }
    return subscriptions
  }

  forget = (subscription: Subscription): Subscription => {
    this.subscriptions = this.subscriptions.filter(s => s !== subscription)
    return subscription
  }

  findAll = (identifier: string): Subscription[] => {
    return this.subscriptions.filter(s => s.identifier === identifier)
  }

  reload = (): void => {
    for (const subscription of this.subscriptions) {
      this.sendCommand(subscription, "subscribe")
    }
  }

  notifyAll = (callbackName: string, ...args: any[]): void => {
    for (const subscription of this.subscriptions) {
      this.notify(subscription, callbackName, ...args)
    }
  }

  notify = (subscription: Subscription | string, callbackName: string, ...args: any[]): void => {
    let subscriptions: Subscription[]
    if (typeof subscription === "string") {
      subscriptions = this.findAll(subscription)
    } else {
      subscriptions = [subscription]
    }

    for (const sub of subscriptions) {
      if (typeof (sub as any)[callbackName] === 'function') {
        ;(sub as any)[callbackName](...args)
      }
    }
  }

  sendCommand = (subscription: Subscription, command: string): void => {
    const { identifier } = subscription
    this.consumer.send({ command, identifier })
  }
}

export default Subscriptions