INTERNAL = require('./internal')

class ConnectionMonitor
  mixins: [Subscribable.Mixin]

  @pollInterval:
    min: 3
    max: 30

  @staleThreshold: 6 # Server::Connections::BEAT_INTERVAL * 2 (missed two pings)

  identifier: INTERNAL.identifiers.ping

  constructor: (@consumer) ->
    @consumer.subscriptions.add(@)
    @start()

  connected: ->
    @reset()
    @pingedAt = now()
    delete @disconnectedAt

  disconnected: ->
    @disconnectedAt = now()

  received: ->
    @pingedAt = now()

  reset: ->
    @reconnectAttempts = 0

  start: ->
    @reset()
    delete @stoppedAt
    @startedAt = now()
    @poll()
    console.log 'subscribe'
    # @appComponent.addEventListener('visibilitychange', @visibilityDidChange)

  stop: ->
    @stoppedAt = now()
    console.log 'un-subscribe'
    # @appComponent.removeEventListener('visibilitychange', @visibilityDidChange)

  poll: ->
    setTimeout =>
      unless @stoppedAt
        @reconnectIfStale()
        @poll()
    , @getInterval()

  getInterval: ->
    {min, max} = @constructor.pollInterval
    interval = 5 * Math.log(@reconnectAttempts + 1)
    clamp(interval, min, max) * 1000

  reconnectIfStale: ->
    if @connectionIsStale()
      @reconnectAttempts++
      unless @disconnectedRecently()
        @consumer.connection.reopen()

  connectionIsStale: ->
    secondsSince(@pingedAt ? @startedAt) > @constructor.staleThreshold

  disconnectedRecently: ->
    @disconnectedAt and secondsSince(@disconnectedAt) < @constructor.staleThreshold

  visibilityDidChange: =>
    if @appComponent.visibilityState is 'visible'
      setTimeout =>
        if @connectionIsStale() or not @consumer.connection.isOpen()
          @consumer.connection.reopen()
      , 200

  toJSON: ->
    interval = @getInterval()
    connectionIsStale = @connectionIsStale()
    {@startedAt, @stoppedAt, @pingedAt, @reconnectAttempts, connectionIsStale, interval}

  now = ->
    new Date().getTime()

  secondsSince = (time) ->
    (now() - time) / 1000

  clamp = (number, min, max) ->
    Math.max(min, Math.min(max, number))

module.exports = ConnectionMonitor
