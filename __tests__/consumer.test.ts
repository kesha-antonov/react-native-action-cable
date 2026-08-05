import Consumer from '../lib/action_cable/consumer'
import type { HeadersProvider, UrlProvider } from '../lib/action_cable/consumer'
import MockWebSocket from './helpers/mock_web_socket'

function buildConsumer(url: UrlProvider = 'ws://example.com/cable', headers?: HeadersProvider) {
  const log = jest.fn()
  const consumer = new Consumer(url, log, MockWebSocket, headers)
  return { consumer, log }
}

describe('Consumer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    MockWebSocket.reset()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('url', () => {
    it('leaves websocket urls untouched', () => {
      expect(buildConsumer('ws://example.com/cable').consumer.url).toBe('ws://example.com/cable')
      expect(buildConsumer('wss://example.com/cable').consumer.url).toBe('wss://example.com/cable')
      expect(buildConsumer('WSS://example.com/cable').consumer.url).toBe('WSS://example.com/cable')
    })

    it('upgrades http urls to websocket urls', () => {
      expect(buildConsumer('http://example.com/cable').consumer.url).toBe('ws://example.com/cable')
      expect(buildConsumer('https://example.com/cable').consumer.url).toBe('wss://example.com/cable')
      expect(buildConsumer('HTTPS://example.com/cable').consumer.url).toBe('wss://example.com/cable')
    })

    it('regression: only rewrites the scheme', () => {
      expect(buildConsumer('https://example.com/http/cable').consumer.url)
        .toBe('wss://example.com/http/cable')
      expect(buildConsumer('https://http.example.com/cable').consumer.url)
        .toBe('wss://http.example.com/cable')
    })

    it('resolves a url function on every read', () => {
      let token = 'first'
      const { consumer } = buildConsumer(() => `wss://example.com/cable?token=${token}`)

      expect(consumer.url).toBe('wss://example.com/cable?token=first')
      token = 'second'
      expect(consumer.url).toBe('wss://example.com/cable?token=second')
    })
  })

  describe('headers', () => {
    it('defaults to an empty object', () => {
      expect(buildConsumer().consumer.headers).toEqual({})
    })

    it('passes static headers through', () => {
      const headers = { Authorization: 'Bearer token' }

      expect(buildConsumer('ws://example.com/cable', headers).consumer.headers).toEqual(headers)
    })

    it('resolves a headers function on every read', () => {
      let token = 'first'
      const { consumer } = buildConsumer('ws://example.com/cable', () => ({ Authorization: token }))

      expect(consumer.headers).toEqual({ Authorization: 'first' })
      token = 'second'
      expect(consumer.headers).toEqual({ Authorization: 'second' })
    })

    it('hands the resolved headers to the socket', () => {
      let token = 'first'
      const { consumer } = buildConsumer('ws://example.com/cable', () => ({ Authorization: token }))

      consumer.connect()
      jest.advanceTimersByTime(1)
      token = 'second'
      consumer.connection.close({ allowReconnect: false })
      consumer.connect()

      expect(MockWebSocket.instances[0].options).toEqual({ headers: { Authorization: 'first' } })
      expect(MockWebSocket.instances[1].options).toEqual({ headers: { Authorization: 'second' } })
    })
  })

  describe('connection management', () => {
    it('connects and disconnects', () => {
      const { consumer } = buildConsumer()

      expect(consumer.connect()).toBe(true)
      jest.advanceTimersByTime(0)
      expect(consumer.connection.isOpen()).toBe(true)

      consumer.disconnect()

      expect(consumer.connection.isActive()).toBe(false)
      expect(consumer.connection.monitor.isRunning()).toBe(false)
    })

    it('only opens a connection when there is none active', () => {
      const { consumer } = buildConsumer()

      consumer.ensureActiveConnection()
      consumer.ensureActiveConnection()

      expect(MockWebSocket.instances).toHaveLength(1)
    })

    it('reopens a closed connection', () => {
      const { consumer } = buildConsumer()
      consumer.connect()
      jest.advanceTimersByTime(0)
      MockWebSocket.last.drop()

      consumer.ensureActiveConnection()

      expect(MockWebSocket.instances).toHaveLength(2)
    })

    it('sends through the connection', () => {
      const { consumer } = buildConsumer()
      consumer.connect()
      jest.advanceTimersByTime(0)

      expect(consumer.send({ command: 'message' })).toBe(true)
      expect(MockWebSocket.last.sent).toContain('{"command":"message"}')
    })
  })

  describe('subprotocols', () => {
    it('appends custom subprotocols to the ActionCable ones', () => {
      const { consumer } = buildConsumer()

      consumer.addSubProtocol('my-protocol')
      consumer.addSubProtocol('another-protocol')
      consumer.connect()

      expect(consumer.subprotocols).toEqual(['my-protocol', 'another-protocol'])
      expect(MockWebSocket.last.protocols).toEqual([
        'actioncable-v1-json',
        'actioncable-unsupported',
        'my-protocol',
        'another-protocol',
      ])
    })
  })
})
