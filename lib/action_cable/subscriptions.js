const Subscription = require('./subscription')

class Subscriptions {
  constructor(consumer) {
    this.consumer = consumer
    this.subscriptions = []
  }

  create(channelName) {
    const channel = channelName
    const params = typeof channel === 'object' ? channel : { channel }
    const subscription = new Subscription(this.consumer, params)
    return this.add(subscription)
  }

  // Private

  add(subscription) {
    this.subscriptions.push(subscription)
    this.consumer.ensureActiveConnection()
    this.notify(subscription, "initialized")
    this.sendCommand(subscription, "subscribe")
    return subscription
  }

  remove(subscription) {
    this.forget(subscription)
    if (!this.findAll(subscription.identifier).length) {
      this.sendCommand(subscription, "unsubscribe")
    }
    return subscription
  }

  reject(identifier) {
    const subscriptions = this.findAll(identifier)
    for (const subscription of subscriptions) {
      this.forget(subscription)
      this.notify(subscription, "rejected")
    }
    return subscriptions
  }

  forget(subscription) {
    this.subscriptions = this.subscriptions.filter(s => s !== subscription)
    return subscription
  }

  findAll(identifier) {
    return this.subscriptions.filter(s => s.identifier === identifier)
  }

  reload() {
    for (const subscription of this.subscriptions) {
      this.sendCommand(subscription, "subscribe")
    }
  }

  notifyAll(callbackName, ...args) {
    for (const subscription of this.subscriptions) {
      this.notify(subscription, callbackName, ...args)
    }
  }

  notify(subscription, callbackName, ...args) {
    let subscriptions
    if (typeof subscription === "string") {
      subscriptions = this.findAll(subscription)
    } else {
      subscriptions = [subscription]
    }

    for (const sub of subscriptions) {
      if (typeof sub[callbackName] === 'function') {
        sub[callbackName](...args)
      }
    }
  }

  sendCommand(subscription, command) {
    const { identifier } = subscription
    this.consumer.send({ command, identifier })
  }
}

module.exports = Subscriptions