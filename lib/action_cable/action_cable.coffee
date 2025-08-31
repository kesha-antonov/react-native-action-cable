Consumer = require('./consumer').default

ActionCable =
  INTERNAL: require('./internal')
  WebSocket: (if typeof window isnt 'undefined' and window.WebSocket then window.WebSocket else if typeof global isnt 'undefined' and global.WebSocket then global.WebSocket else WebSocket)
  logger: (if typeof window isnt 'undefined' and window.console then window.console else if typeof global isnt 'undefined' and global.console then global.console else console)

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
