import ActionCable from '../lib/action_cable/action_cable'
import INTERNAL from '../lib/action_cable/internal'
import MockWebSocket from './helpers/mock_web_socket'

describe('ActionCable', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    MockWebSocket.reset()
    ActionCable.WebSocket = MockWebSocket
    ActionCable.stopDebugging()
    Object.keys(ActionCable._consumers).forEach(key => delete ActionCable._consumers[key])
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('exposes the ActionCable protocol internals', () => {
    expect(ActionCable.INTERNAL).toBe(INTERNAL)
    expect(INTERNAL.protocols).toContain('actioncable-v1-json')
  })

  describe('createConsumer', () => {
    it('builds a consumer wired to the configured WebSocket implementation', () => {
      const consumer = ActionCable.createConsumer('https://example.com/cable')

      expect(consumer.url).toBe('wss://example.com/cable')
      expect(consumer.WebSocket).toBe(MockWebSocket)
    })

    it('always builds a new consumer', () => {
      const first = ActionCable.createConsumer('wss://example.com/cable')
      const second = ActionCable.createConsumer('wss://example.com/cable')

      expect(first).not.toBe(second)
      expect(ActionCable._consumers).toEqual({})
    })
  })

  describe('getOrCreateConsumer', () => {
    it('regression: returns the same consumer before a connection was ever opened', () => {
      const first = ActionCable.getOrCreateConsumer('wss://example.com/cable')
      const second = ActionCable.getOrCreateConsumer('wss://example.com/cable')

      expect(second).toBe(first)
    })

    it('regression: keeps the consumer and its subscriptions across a dropped connection', () => {
      const consumer = ActionCable.getOrCreateConsumer('wss://example.com/cable')
      const subscription = consumer.subscriptions.create('ChatChannel')
      jest.advanceTimersByTime(0)
      MockWebSocket.last.drop()

      const reused = ActionCable.getOrCreateConsumer('wss://example.com/cable')

      expect(reused).toBe(consumer)
      expect(reused.subscriptions.subscriptions).toEqual([subscription])
    })

    it('revives the connection of a reused consumer', () => {
      const consumer = ActionCable.getOrCreateConsumer('wss://example.com/cable')
      consumer.connect()
      jest.advanceTimersByTime(0)
      MockWebSocket.last.drop()
      expect(consumer.connection.isActive()).toBe(false)

      ActionCable.getOrCreateConsumer('wss://example.com/cable')

      expect(consumer.connection.isActive()).toBe(true)
    })

    it('keeps one consumer per url and headers pair', () => {
      const first = ActionCable.getOrCreateConsumer('wss://example.com/cable')
      const other = ActionCable.getOrCreateConsumer('wss://example.com/other-cable')
      const authorized = ActionCable.getOrCreateConsumer('wss://example.com/cable', { Authorization: 'a' })
      const differentlyAuthorized = ActionCable.getOrCreateConsumer('wss://example.com/cable', { Authorization: 'b' })

      expect(new Set([first, other, authorized, differentlyAuthorized]).size).toBe(4)
      expect(Object.keys(ActionCable._consumers)).toHaveLength(4)
    })

    it('builds the cache key from resolved url and headers functions', () => {
      const key = ActionCable._createCacheKey(() => 'wss://example.com/cable', () => ({ Authorization: 'token' }))

      expect(key).toBe('wss://example.com/cable|{"Authorization":"token"}')
    })
  })

  describe('disconnectConsumer', () => {
    it('disconnects and drops the cached consumer', () => {
      const consumer = ActionCable.getOrCreateConsumer('wss://example.com/cable')
      consumer.connect()
      jest.advanceTimersByTime(0)

      expect(ActionCable.disconnectConsumer('wss://example.com/cable')).toBe(true)
      expect(consumer.connection.isActive()).toBe(false)
      expect(consumer.connection.monitor.isRunning()).toBe(false)
      expect(ActionCable._consumers).toEqual({})
    })

    it('reports when there was nothing to disconnect', () => {
      expect(ActionCable.disconnectConsumer('wss://example.com/unknown')).toBe(false)
    })

    it('lets a later call build a fresh consumer', () => {
      const consumer = ActionCable.getOrCreateConsumer('wss://example.com/cable')
      ActionCable.disconnectConsumer('wss://example.com/cable')

      expect(ActionCable.getOrCreateConsumer('wss://example.com/cable')).not.toBe(consumer)
    })
  })

  describe('debugging', () => {
    it('is off by default and logs nothing', () => {
      const logger = { log: jest.fn() }
      ActionCable.logger = logger

      ActionCable.log('quiet')

      expect(ActionCable.debugging).toBe(false)
      expect(logger.log).not.toHaveBeenCalled()
    })

    it('logs with a timestamp while debugging', () => {
      const logger = { log: jest.fn() }
      ActionCable.logger = logger

      ActionCable.startDebugging()
      ActionCable.log('hello', { a: 1 })

      expect(ActionCable.debugging).toBe(true)
      expect(logger.log).toHaveBeenCalledWith('[ActionCable]', 'hello', { a: 1 }, expect.any(Number))
    })

    it('regression: stops debugging with a boolean flag', () => {
      const logger = { log: jest.fn() }
      ActionCable.logger = logger
      ActionCable.startDebugging()

      ActionCable.stopDebugging()
      ActionCable.log('quiet')

      expect(ActionCable.debugging).toBe(false)
      expect(logger.log).not.toHaveBeenCalled()
    })
  })
})
