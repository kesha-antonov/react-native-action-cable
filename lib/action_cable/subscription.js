const EventEmitter = require('eventemitter3')

class Subscription extends EventEmitter {
  constructor(consumer, params = {}) {
    super()
    this.consumer = consumer
    this.identifier = JSON.stringify(params)
  }

  // NOTE: PERFORM A CHANNEL ACTION WITH THE OPTIONAL DATA PASSED AS AN ATTRIBUTE
  perform(action, data = {}) {
    data.action = action
    this.send(data)
  }

  send(data) {
    this.consumer.send({
      command: 'message',
      identifier: this.identifier,
      data: JSON.stringify(data)
    })
  }

  unsubscribe() {
    this.consumer.subscriptions.remove(this)
  }

  connected() {
    this.emit('connected')
  }

  disconnected() {
    this.emit('disconnected')
  }

  rejected() {
    this.emit('rejected')
  }

  error(error) {
    this.emit('error', error)
  }

  received(data = {}) {
    data.action = data.action != null ? data.action : 'received'
    this.emit(data.action, data)
  }
}

module.exports = Subscription