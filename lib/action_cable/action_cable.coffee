Consumer = require('./consumer').default

ActionCable =
  INTERNAL: require('./internal')
  WebSocket: (if typeof window isnt 'undefined' and window.WebSocket then window.WebSocket else if typeof global isnt 'undefined' and global.WebSocket then global.WebSocket else WebSocket)
  logger: (if typeof window isnt 'undefined' and window.console then window.console else if typeof global isnt 'undefined' and global.console then global.console else console)

  createConsumer: (url, headers = {}) ->
    new Consumer(url, @log, @WebSocket, headers)

  getOrCreateConsumer: (url, headers = {}) ->
    # Create a cache key based on URL and headers
    cacheKey = @_createCacheKey(url, headers)
    
    # Return existing consumer if it exists and is active
    if @_consumers[cacheKey]?.connection.isActive()
      @log("Reusing existing consumer for", url)
      return @_consumers[cacheKey]
    
    # Clean up disconnected consumer if exists
    if @_consumers[cacheKey] && !@_consumers[cacheKey].connection.isActive()
      @log("Cleaning up disconnected consumer for", url)
      @_consumers[cacheKey].disconnect()
      delete @_consumers[cacheKey]
    
    # Create new consumer and cache it
    @log("Creating new consumer for", url)
    consumer = new Consumer(url, @log, @WebSocket, headers)
    @_consumers[cacheKey] = consumer
    consumer

  disconnectConsumer: (url, headers = {}) ->
    cacheKey = @_createCacheKey(url, headers)
    if @_consumers[cacheKey]
      @_consumers[cacheKey].disconnect()
      delete @_consumers[cacheKey]
      @log("Disconnected consumer for", url)
      true
    else
      false

  _createCacheKey: (url, headers) ->
    # Create URL string (handle function case)
    urlStr = if typeof url is 'function' then url() else url
    # Create headers string (handle function case)
    headersStr = JSON.stringify(if typeof headers is 'function' then headers() else headers)
    "#{urlStr}|#{headersStr}"

  startDebugging: ->
    @debugging = true

  stopDebugging: ->
    @debugging = null

  log: (messages...) ->
    if ActionCable.debugging
      messages.push(Date.now())
      ActionCable.logger.log("[ActionCable]", messages...)

export default ActionCable
