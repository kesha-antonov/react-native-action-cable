{message_types, protocols} = require('./internal').default
ConnectionMonitor = require('./connection_monitor').default


[supportedProtocols..., unsupportedProtocol] = protocols

class Connection
  @reopenDelay: 500

  constructor: (@consumer, @log, @WebSocket) ->
    { @subscriptions } = @consumer
    @monitor = new ConnectionMonitor(@, @log)
    @disconnected = true

  send: (data) =>
    if @isOpen()
      @webSocket.send(JSON.stringify(data))
      true
    else
      false

  open: =>
    if @isActive()
      @log("Attempted to open WebSocket, but existing socket is #{@getState()}")
      false
    else
      @log("Opening WebSocket, current state is #{@getState()}, subprotocols: #{protocols}")
      @uninstallEventHandlers() if @webSocket?
      @webSocket = new @WebSocket(@consumer.url, protocols, {headers: @consumer.headers})
      @installEventHandlers()
      @monitor.start()
      true

  close: ({allowReconnect} = {allowReconnect: true}) =>
    @monitor.stop() unless allowReconnect
    @webSocket?.close() if @isActive()

  reopen: =>
    @log("Reopening WebSocket, current state is #{@getState()}")
    if @isActive()
      try
        @close()
      catch error
        @log("Failed to reopen WebSocket", error)
      finally
        @log("Reopening WebSocket in #{@constructor.reopenDelay}ms")
        setTimeout(@open, @constructor.reopenDelay)
    else
      @open()

  getProtocol: =>
    @webSocket?.protocol

  isOpen: =>
    @isState("open")

  isActive: =>
    @isState("open", "connecting")

  # Private

  isProtocolSupported: =>
    @getProtocol() in supportedProtocols

  isState: (states...) =>
    @getState() in states

  getState: =>
    return state.toLowerCase() for state, value of WebSocket when value is @webSocket?.readyState
    null

  installEventHandlers: =>
    for eventName of @events
      handler = @events[eventName].bind(this)
      @webSocket["on#{eventName}"] = handler
    return

  uninstallEventHandlers: =>
    for eventName of @events
      @webSocket["on#{eventName}"] = =>
    return

  events:
    message: (event) ->
      unless @isProtocolSupported()
        event.data.close() if event.data.close?
        return

      { identifier, message, type } = JSON.parse(event.data)
      event.data.close() if event.data.close?

      switch type
        when message_types.welcome
          @monitor.recordConnect()
          @subscriptions.reload()
        when message_types.ping
          @monitor.recordPing()
        when message_types.confirmation
          @subscriptions.notify(identifier, "connected")
        when message_types.rejection
          @subscriptions.reject(identifier)
        else
          @subscriptions.notify(identifier, "received", message)

    open: ->
      @log("WebSocket onopen event, using '#{@getProtocol()}' subprotocol")
      @disconnected = false
      if not @isProtocolSupported()
        @log("Protocol is unsupported. Stopping monitor and disconnecting.")
        @close(allowReconnect: false)

    close: (event) ->
      @log("WebSocket onclose event")
      return if @disconnected
      @disconnected = true
      @monitor.recordDisconnect()
      @subscriptions.notifyAll("disconnected", {willAttemptReconnect: @monitor.isRunning()})

    error: ->
      @log("WebSocket onerror event")

export default Connection
