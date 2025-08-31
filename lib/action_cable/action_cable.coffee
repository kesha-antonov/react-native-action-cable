Consumer = require('./consumer').default

ActionCable =
  INTERNAL: require('./internal')
  WebSocket: window.WebSocket
  logger: window.console
  _consumers: {}

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
