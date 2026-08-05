import Connection from '../lib/action_cable/connection'
import type { Consumer } from '../lib/action_cable/connection'
import MockWebSocket, { READY_STATE } from './helpers/mock_web_socket'

function buildConnection(consumerOverrides: Partial<Consumer> = {}) {
  const subscriptions = {
    reload: jest.fn(),
    notify: jest.fn(),
    reject: jest.fn(),
    notifyAll: jest.fn(),
    confirmSubscription: jest.fn(),
  }
  const consumer: Consumer = {
    url: 'ws://example.com/cable',
    headers: { Authorization: 'Bearer token' },
    subprotocols: [],
    subscriptions,
    ...consumerOverrides,
  }
  const log = jest.fn()
  const connection = new Connection(consumer, log, MockWebSocket)
  return { connection, consumer, subscriptions, log }
}

/** Opens the connection and lets the socket finish its handshake. */
function connect(connection: Connection): void {
  connection.open()
  jest.advanceTimersByTime(0)
}

describe('Connection', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    MockWebSocket.reset()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('open', () => {
    it('opens a socket with the consumer url, protocols and headers', () => {
      const { connection } = buildConnection({ subprotocols: ['custom-protocol'] })

      expect(connection.open()).toBe(true)
      expect(MockWebSocket.instances).toHaveLength(1)
      expect(MockWebSocket.last.url).toBe('ws://example.com/cable')
      expect(MockWebSocket.last.protocols).toEqual([
        'actioncable-v1-json',
        'actioncable-unsupported',
        'custom-protocol',
      ])
      expect(MockWebSocket.last.options).toEqual({ headers: { Authorization: 'Bearer token' } })
    })

    it('does not open a second socket while one is active', () => {
      const { connection, log } = buildConnection()
      connect(connection)

      expect(connection.open()).toBe(false)
      expect(MockWebSocket.instances).toHaveLength(1)
      expect(log).toHaveBeenCalledWith(expect.stringContaining('existing socket is open'))
    })

    it('starts the connection monitor', () => {
      const { connection } = buildConnection()
      connect(connection)

      expect(connection.monitor.isRunning()).toBe(true)
    })

    it('detaches the handlers of the previous socket before opening a new one', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)
      const abandoned = MockWebSocket.last

      MockWebSocket.autoOpen = false
      abandoned.readyState = READY_STATE.CLOSED
      connect(connection)
      subscriptions.notifyAll.mockClear()
      abandoned.drop()

      expect(subscriptions.notifyAll).not.toHaveBeenCalled()
    })
  })

  describe('getState', () => {
    it('reports the state of a WebSocket class that has no enumerable constants', () => {
      const { connection } = buildConnection()
      connect(connection)

      expect(connection.getState()).toBe('open')
      expect(connection.isOpen()).toBe(true)
      expect(connection.isActive()).toBe(true)

      MockWebSocket.last.readyState = READY_STATE.CONNECTING
      expect(connection.getState()).toBe('connecting')
      expect(connection.isOpen()).toBe(false)
      expect(connection.isActive()).toBe(true)

      MockWebSocket.last.readyState = READY_STATE.CLOSING
      expect(connection.getState()).toBe('closing')
      expect(connection.isActive()).toBe(false)

      MockWebSocket.last.readyState = READY_STATE.CLOSED
      expect(connection.getState()).toBe('closed')
      expect(connection.isActive()).toBe(false)
    })

    it('regression: works when the environment has no global WebSocket', () => {
      const globalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket
      delete (globalThis as { WebSocket?: unknown }).WebSocket

      try {
        const { connection } = buildConnection()
        connect(connection)

        expect(connection.getState()).toBe('open')
        expect(connection.isOpen()).toBe(true)
        expect(connection.send({ command: 'subscribe' })).toBe(true)
      } finally {
        ;(globalThis as { WebSocket?: unknown }).WebSocket = globalWebSocket
      }
    })

    it('honours the constants of the injected WebSocket implementation', () => {
      class ExoticWebSocket {
        static CONNECTING = 10
        static OPEN = 20
        static CLOSING = 30
        static CLOSED = 40
        readyState = ExoticWebSocket.OPEN
        close = jest.fn()
        send = jest.fn()
      }

      const { connection } = buildConnection()
      connection.WebSocket = ExoticWebSocket
      connection.open()

      expect(connection.getState()).toBe('open')

      connection.webSocket.readyState = ExoticWebSocket.CLOSED
      expect(connection.getState()).toBe('closed')
    })

    it('returns null when there is no socket or no readyState', () => {
      const { connection } = buildConnection()
      expect(connection.getState()).toBeNull()

      connect(connection)
      MockWebSocket.last.readyState = undefined as unknown as number
      expect(connection.getState()).toBeNull()
      expect(connection.isActive()).toBe(false)
    })
  })

  describe('send', () => {
    it('serializes the data when the socket is open', () => {
      const { connection } = buildConnection()
      connect(connection)

      expect(connection.send({ command: 'message', identifier: 'id' })).toBe(true)
      expect(MockWebSocket.last.sent).toContain('{"command":"message","identifier":"id"}')
    })

    it('returns false when the socket is not open', () => {
      const { connection } = buildConnection()
      expect(connection.send({ command: 'message' })).toBe(false)

      connect(connection)
      MockWebSocket.last.readyState = READY_STATE.CLOSED
      expect(connection.send({ command: 'message' })).toBe(false)
    })
  })

  describe('close', () => {
    it('closes the socket and keeps the monitor running by default', () => {
      const { connection } = buildConnection()
      connect(connection)

      connection.close()

      expect(MockWebSocket.last.readyState).toBe(READY_STATE.CLOSED)
      expect(connection.monitor.isRunning()).toBe(true)
    })

    it('leaves a connecting socket alone (Safari 15.1+ hangs on closing one)', () => {
      const { connection } = buildConnection()
      connection.open()
      expect(connection.getState()).toBe('connecting')

      connection.close()

      expect(MockWebSocket.last.readyState).toBe(READY_STATE.CONNECTING)
    })

    it('stops the monitor even when there is no socket to close', () => {
      const { connection } = buildConnection()
      connection.open()

      expect(() => connection.close({ allowReconnect: false })).not.toThrow()
      expect(connection.monitor.isRunning()).toBe(false)
    })

    it('stops the monitor when reconnecting is not allowed', () => {
      const { connection } = buildConnection()
      connect(connection)

      connection.close({ allowReconnect: false })

      expect(connection.monitor.isRunning()).toBe(false)
    })
  })

  describe('reopen', () => {
    it('closes an active socket and opens a new one after the reopen delay', () => {
      const { connection } = buildConnection()
      connect(connection)

      connection.reopen()
      expect(MockWebSocket.instances).toHaveLength(1)

      jest.advanceTimersByTime(Connection.reopenDelay)
      expect(MockWebSocket.instances).toHaveLength(2)
    })

    it('opens immediately when there is no active socket', () => {
      const { connection } = buildConnection()

      connection.reopen()

      expect(MockWebSocket.instances).toHaveLength(1)
    })
  })

  describe('incoming messages', () => {
    it('reloads subscriptions on welcome and records the connect', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      expect(subscriptions.reload).toHaveBeenCalledTimes(1)
      expect(connection.monitor.reconnectAttempts).toBe(0)
    })

    it('confirms a subscription and reports it as a first connect', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      MockWebSocket.last.confirmSubscription('{"channel":"ChatChannel"}')

      expect(subscriptions.confirmSubscription).toHaveBeenCalledWith('{"channel":"ChatChannel"}')
      expect(subscriptions.notify).toHaveBeenCalledWith(
        '{"channel":"ChatChannel"}',
        'connected',
        { reconnected: false },
      )
    })

    it('reports a subscription confirmed after a reconnect as reconnected', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      // A reconnect attempt happened before the server sent a new welcome
      connection.monitor.reconnectAttempts = 1
      MockWebSocket.last.deliver({ type: 'welcome' })
      MockWebSocket.last.confirmSubscription('id')

      expect(subscriptions.notify).toHaveBeenLastCalledWith('id', 'connected', { reconnected: true })

      // The flag is consumed once: the next confirmation is a plain connect
      MockWebSocket.last.confirmSubscription('id')
      expect(subscriptions.notify).toHaveBeenLastCalledWith('id', 'connected', { reconnected: false })
    })

    it('rejects a subscription', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      MockWebSocket.last.rejectSubscription('id')

      expect(subscriptions.reject).toHaveBeenCalledWith('id')
    })

    it('forwards unknown message types as received data', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      MockWebSocket.last.broadcast('id', { text: 'hello' })

      expect(subscriptions.notify).toHaveBeenCalledWith('id', 'received', { text: 'hello' })
    })

    it('ignores pings but records them as activity', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)
      subscriptions.notify.mockClear()

      MockWebSocket.last.deliver({ type: 'ping', message: 1 })

      expect(subscriptions.notify).not.toHaveBeenCalled()
      expect(connection.monitor.connectionIsStale()).toBe(false)
    })

    it('closes without reconnecting when the server disconnects for good', () => {
      const { connection } = buildConnection()
      connect(connection)

      MockWebSocket.last.deliver({ type: 'disconnect', reason: 'unauthorized', reconnect: false })

      expect(connection.monitor.isRunning()).toBe(false)
      expect(MockWebSocket.last.readyState).toBe(READY_STATE.CLOSED)
    })

    it('keeps the monitor running when the server allows a reconnect', () => {
      const { connection } = buildConnection()
      connect(connection)

      MockWebSocket.last.deliver({ type: 'disconnect', reason: 'server_restart', reconnect: true })

      expect(connection.monitor.isRunning()).toBe(true)
    })
  })

  describe('unsupported protocol', () => {
    beforeEach(() => {
      MockWebSocket.negotiatedProtocol = 'actioncable-unsupported'
    })

    it('closes the connection for good when the negotiated protocol is unsupported', () => {
      const { connection } = buildConnection()
      connect(connection)

      expect(connection.isProtocolSupported()).toBe(false)
      expect(connection.monitor.isRunning()).toBe(false)
    })

    it('drops incoming messages', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)
      subscriptions.notify.mockClear()

      MockWebSocket.last.broadcast('id', { text: 'hello' })

      expect(subscriptions.notify).not.toHaveBeenCalled()
    })
  })

  describe('socket lifecycle events', () => {
    it('notifies all subscriptions when the socket closes, with the reconnect intent', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      MockWebSocket.last.drop()

      expect(subscriptions.notifyAll).toHaveBeenCalledWith('disconnected', expect.objectContaining({ willAttemptReconnect: true }))
    })

    it('reports that no reconnect will be attempted once the monitor is stopped', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      connection.close({ allowReconnect: false })

      expect(subscriptions.notifyAll).toHaveBeenCalledWith('disconnected', expect.objectContaining({ willAttemptReconnect: false }))
    })

    it('notifies disconnected only once per socket', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      MockWebSocket.last.drop()
      MockWebSocket.last.onclose?.({})

      expect(subscriptions.notifyAll).toHaveBeenCalledTimes(1)
    })

    it('forwards socket errors to every subscription with a readable message', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)
      const event = new Error('boom')

      MockWebSocket.last.fail(event)

      expect(subscriptions.notifyAll).toHaveBeenCalledWith('error', { message: 'boom', event })
    })

    it('describes an error event that carries no detail of its own', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)
      // React Native dispatches a bare Event on websocketFailed
      const event = { type: 'error' }

      MockWebSocket.last.fail(event)

      expect(subscriptions.notifyAll).toHaveBeenCalledWith('error', { message: 'WebSocket error', event })
    })

    it('passes the close code and reason to disconnected listeners', () => {
      const { connection, subscriptions } = buildConnection()
      connect(connection)

      MockWebSocket.last.onclose?.({ code: 1006, reason: 'Connection refused' })

      expect(subscriptions.notifyAll).toHaveBeenCalledWith('disconnected', {
        willAttemptReconnect: true,
        code: 1006,
        reason: 'Connection refused',
      })
    })
  })
})
