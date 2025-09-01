const EventEmitter = require('eventemitter3')

/**
 * @typedef {Object.<string, any>} SubscriptionParams
 */

/**
 * @typedef {Object} Consumer
 * @property {function(any): void} send
 * @property {Object} subscriptions
 * @property {function(Subscription): void} subscriptions.remove
 */

class Subscription extends EventEmitter {
  /**
   * @param {Consumer} consumer
   * @param {SubscriptionParams} params
   */
  constructor(consumer, params = {}) {
    super()
    /** @type {Consumer} */
    this.consumer = consumer
    /** @type {string} */
    this.identifier = JSON.stringify(params)
  }

  // NOTE: PERFORM A CHANNEL ACTION WITH THE OPTIONAL DATA PASSED AS AN ATTRIBUTE
  /**
   * @param {string} action
   * @param {any} data
   */
  perform = (action, data = {}) => {
    data.action = action
    this.send(data)
  }

  /**
   * @param {any} data
   */
  send = (data) => {
    this.consumer.send({
      command: 'message',
      identifier: this.identifier,
      data: JSON.stringify(data)
    })
  }

  unsubscribe = () => {
    this.consumer.subscriptions.remove(this)
  }

  connected = () => {
    this.emit('connected')
  }

  disconnected = () => {
    this.emit('disconnected')
  }

  rejected = () => {
    this.emit('rejected')
  }

  /**
   * @param {any} error
   */
  error = (error) => {
    this.emit('error', error)
  }

  /**
   * @param {any} data
   */
  received = (data = {}) => {
    data.action = data.action != null ? data.action : 'received'
    this.emit(data.action, data)
  }
}

module.exports = Subscription