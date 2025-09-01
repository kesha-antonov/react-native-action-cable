const INTERNAL = require('./internal')
const Subscription = require('./subscription')

/**
 * @typedef {Object} ChannelParams
 * @property {string} channel
 * @property {any} [key]
 */

class Subscriptions {
  /**
   * @param {any} consumer
   */
  constructor(consumer) {
    /** @type {any} */
    this.consumer = consumer
    /** @type {any[]} */
    this.subscriptions = []
  }

  /**
   * @param {string | ChannelParams} channelName
   * @returns {any}
   */
  create = (channelName) => {
    const channel = channelName
    const params = typeof channel === 'object' ? channel : { channel }
    const subscription = new Subscription(this.consumer, params)
    return this.add(subscription)
  }

  // Private

  /**
   * @param {any} subscription
   * @returns {any}
   */
  add = (subscription) => {
    this.subscriptions.push(subscription)
    this.consumer.ensureActiveConnection()
    this.notify(subscription, "initialized")
    this.sendCommand(subscription, "subscribe")
    return subscription
  }

  /**
   * @param {any} subscription
   * @returns {any}
   */
  remove = (subscription) => {
    this.forget(subscription)
    if (!this.findAll(subscription.identifier).length) {
      this.sendCommand(subscription, "unsubscribe")
    }
    return subscription
  }

  /**
   * @param {string} identifier
   * @returns {any[]}
   */
  reject = (identifier) => {
    const subscriptions = this.findAll(identifier)
    for (const subscription of subscriptions) {
      this.forget(subscription)
      this.notify(subscription, "rejected")
    }
    return subscriptions
  }

  /**
   * @param {any} subscription
   * @returns {any}
   */
  forget = (subscription) => {
    this.subscriptions = this.subscriptions.filter(s => s !== subscription)
    return subscription
  }

  /**
   * @param {string} identifier
   * @returns {any[]}
   */
  findAll = (identifier) => {
    return this.subscriptions.filter(s => s.identifier === identifier)
  }

  reload = () => {
    for (const subscription of this.subscriptions) {
      this.sendCommand(subscription, "subscribe")
    }
  }

  /**
   * @param {string} callbackName
   * @param {...any} args
   */
  notifyAll = (callbackName, ...args) => {
    for (const subscription of this.subscriptions) {
      this.notify(subscription, callbackName, ...args)
    }
  }

  /**
   * @param {any} subscription
   * @param {string} callbackName
   * @param {...any} args
   */
  notify = (subscription, callbackName, ...args) => {
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

  /**
   * @param {any} subscription
   * @param {string} command
   */
  sendCommand = (subscription, command) => {
    const { identifier } = subscription
    this.consumer.send({ command, identifier })
  }
}

module.exports = Subscriptions