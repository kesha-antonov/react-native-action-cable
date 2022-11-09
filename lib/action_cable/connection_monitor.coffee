{ AppState } = require('react-native')


APP_STATE_ACTIVE = 'active'

class ConnectionMonitor
  @pollInterval:
    min: 3
    max: 30

  @staleThreshold: 6 # Server::Connections::BEAT_INTERVAL * 2 (missed two pings)

  constructor: (@connection, @log) ->
    @reconnectAttempts = 0

  start: =>
    unless @isRunning()
      @startedAt = now()
      delete @stoppedAt
      @startPolling()
      @appStateEventListener = AppState.addEventListener("change", @visibilityDidChange)
      @log("ConnectionMonitor started. pollInterval = #{@getPollInterval()} ms")

  stop: =>
    if @isRunning()
      @stoppedAt = now()
      @stopPolling()
      @appStateEventListener?.remove()
      @log("ConnectionMonitor stopped")

  isRunning: =>
    @startedAt? and not @stoppedAt?

  recordPing: =>
    @pingedAt = now()

  recordConnect: =>
    @reconnectAttempts = 0
    @recordPing()
    delete @disconnectedAt
    @log("ConnectionMonitor recorded connect")

  recordDisconnect: =>
    @disconnectedAt = now()
    @log("ConnectionMonitor recorded disconnect")

  # Private

  startPolling: =>
    @stopPolling()
    @poll()

  stopPolling: =>
    clearTimeout(@pollTimeout)

  poll: =>
    @pollTimeout = setTimeout =>
      @reconnectIfStale()
      @poll()
    , @getPollInterval()

  getPollInterval: =>
    {min, max} = @constructor.pollInterval
    interval = 5 * Math.log(@reconnectAttempts + 1)
    Math.round(clamp(interval, min, max) * 1000)

  reconnectIfStale: =>
    if @connectionIsStale()
      @log("ConnectionMonitor detected stale connection. reconnectAttempts = #{@reconnectAttempts}, pollInterval = #{@getPollInterval()} ms, time disconnected = #{secondsSince(@disconnectedAt)} s, stale threshold = #{@constructor.staleThreshold} s")
      @reconnectAttempts++
      if @disconnectedRecently()
        @log("ConnectionMonitor skipping reopening recent disconnect")
      else
        @log("ConnectionMonitor reopening")
        @connection.reopen()

  connectionIsStale: =>
    secondsSince(@pingedAt ? @startedAt) > @constructor.staleThreshold

  disconnectedRecently: =>
    @disconnectedAt and secondsSince(@disconnectedAt) < @constructor.staleThreshold

  visibilityDidChange: =>
    if AppState.currentState is APP_STATE_ACTIVE
      setTimeout =>
        if @connectionIsStale() or not @connection.isOpen()
          @log("ConnectionMonitor reopening stale connection on change. visbilityState = #{AppState.currentState}")
          @connection.reopen()
      , 200

  now = ->
    new Date().getTime()

  secondsSince = (time) ->
    (now() - time) / 1000

  clamp = (number, min, max) ->
    Math.max(min, Math.min(max, number))

export default ConnectionMonitor
