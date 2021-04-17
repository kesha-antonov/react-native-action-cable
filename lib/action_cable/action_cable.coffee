Consumer = require('./consumer').default

ActionCable =
  INTERNAL: require('./internal')
  WebSocket: window.WebSocket
  logger: window.console

  createConsumer: (url, headers = {}) ->
    new Consumer(url, @log, @WebSocket, headers)

  startDebugging: ->
    @debugging = true

  stopDebugging: ->
    @debugging = null

  log: (messages...) ->
    if ActionCable.debugging
      messages.push(Date.now())
      ActionCable.logger.log("[ActionCable]", messages...)

export default ActionCable
