EventEmitter = require('eventemitter3')

class Subscription extends EventEmitter
  constructor: (@consumer, params = {}) ->
    super()

    @identifier = JSON.stringify(params)

  # NOTE: PERFORM A CHANNEL ACTION WITH THE OPTIONAL DATA PASSED AS AN ATTRIBUTE
  perform: (action, data = {}) =>
    data.action = action
    @send(data)

  send: (data) =>
    @consumer.send(command: 'message', identifier: @identifier, data: JSON.stringify(data))

  unsubscribe: =>
    @consumer.subscriptions.remove(this)

  connected: =>
    @emit('connected')

  disconnected: =>
    @emit('disconnected')

  rejected: =>
    @emit('rejected')

  received: (data = {}) =>
    data.action = if data.action? then data.action else 'received'
    @emit(data.action, data)

export default Subscription
