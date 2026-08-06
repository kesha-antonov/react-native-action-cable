/**
 * End-to-end flows through the public API, against a WebSocket double that
 * behaves like a Rails ActionCable server.
 */
import ActionCable from '../lib/action_cable/action_cable'
import type { ChannelParams } from '../lib/action_cable/subscriptions'
import Cable from '../lib/cable'
import ConnectionMonitor from '../lib/action_cable/connection_monitor'
import SubscriptionGuarantor from '../lib/action_cable/subscription_guarantor'
import MockWebSocket from './helpers/mock_web_socket'

const staleThresholdMs = ConnectionMonitor.staleThreshold * 1000

/** Lets the socket finish the work it scheduled: handshake, confirmations... */
function flushSocketWork(): void {
  for (let i = 0; i < 3; i++) jest.advanceTimersByTime(1)
}

/** Long enough for the monitor to notice a stale connection and reopen it. */
function letTheMonitorReconnect(): void {
  jest.advanceTimersByTime(staleThresholdMs * 4)
  flushSocketWork()
}

describe('ActionCable end to end', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // The monitor jitters its poll interval by up to 100% on the first attempt,
    // so without pinning the jitter `letTheMonitorReconnect` advances a fixed
    // amount of time past a randomly placed poll and the reconnect assertions
    // fail intermittently. Same stub as connection_monitor.test.ts.
    jest.spyOn(Math, 'random').mockReturnValue(0)
    MockWebSocket.reset()
    ActionCable.WebSocket = MockWebSocket
    Object.keys(ActionCable._consumers).forEach(key => delete ActionCable._consumers[key])
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  function subscribe(channelParams: ChannelParams = { channel: 'ChatChannel', roomId: 1 }) {
    const consumer = ActionCable.createConsumer('https://example.com/cable')
    const cable = new Cable({})
    const events: Array<[string, unknown]> = []
    const channel = cable.setChannel('ChatChannel', consumer.subscriptions.create(channelParams))

    channel
      .on('connected', (payload: unknown) => events.push(['connected', payload]))
      .on('disconnected', (payload: unknown) => events.push(['disconnected', payload]))
      .on('received', (data: unknown) => events.push(['received', data]))
      .on('rejected', () => events.push(['rejected', undefined]))
      .on('error', (error: unknown) => events.push(['error', error]))
      .on('speak', (data: unknown) => events.push(['speak', data]))

    flushSocketWork()
    return { consumer, cable, channel, events }
  }

  it('subscribes, receives and sends messages', () => {
    const { consumer, channel, events } = subscribe()

    expect(consumer.connection.isOpen()).toBe(true)
    expect(MockWebSocket.last.commandsOfType('subscribe')).toHaveLength(1)
    expect(events).toContainEqual(['connected', { reconnected: false }])

    MockWebSocket.last.broadcast(channel.identifier, { text: 'hello' })
    expect(events).toContainEqual(['received', { text: 'hello', action: 'received' }])

    channel.perform('speak', { text: 'hi there' })
    expect(MockWebSocket.last.commandsOfType('message')[0]).toEqual({
      command: 'message',
      identifier: channel.identifier,
      data: JSON.stringify({ text: 'hi there', action: 'speak' }),
    })

    channel.unsubscribe()
    expect(MockWebSocket.last.commandsOfType('unsubscribe')).toHaveLength(1)
    expect(consumer.subscriptions.subscriptions).toHaveLength(0)
  })

  it('routes messages carrying an action to their own event', () => {
    const { channel, events } = subscribe()

    MockWebSocket.last.broadcast(channel.identifier, { action: 'speak', text: 'hello!' })

    expect(events).toContainEqual(['speak', { action: 'speak', text: 'hello!' }])
    expect(events.filter(([name]) => name === 'received')).toHaveLength(0)
  })

  it('delivers a broadcast to every subscription of the same channel', () => {
    const consumer = ActionCable.createConsumer('wss://example.com/cable')
    const first = consumer.subscriptions.create('ChatChannel')
    const second = consumer.subscriptions.create('ChatChannel')
    const received: unknown[] = []
    first.on('received', data => received.push(data))
    second.on('received', data => received.push(data))
    flushSocketWork()

    MockWebSocket.last.broadcast(first.identifier, { text: 'hello' })

    expect(received).toEqual([
      { text: 'hello', action: 'received' },
      { text: 'hello', action: 'received' },
    ])
  })

  it('reconnects a dropped connection and reports the reconnect to subscriptions', () => {
    const { consumer, channel, events } = subscribe()

    MockWebSocket.last.drop()
    expect(events).toContainEqual(['disconnected', expect.objectContaining({ willAttemptReconnect: true })])

    letTheMonitorReconnect()

    expect(MockWebSocket.instances.length).toBeGreaterThan(1)
    expect(consumer.connection.isOpen()).toBe(true)
    expect(events).toContainEqual(['connected', { reconnected: true }])
    // The subscription was re-established on the new socket
    expect(MockWebSocket.last.commandsOfType('subscribe')).toEqual([
      { command: 'subscribe', identifier: channel.identifier },
    ])
  })

  it('retries a subscription the server never confirms', () => {
    MockWebSocket.autoConfirmSubscriptions = false
    const { channel } = subscribe()

    expect(MockWebSocket.last.commandsOfType('subscribe')).toHaveLength(1)

    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval * 3)
    expect(MockWebSocket.last.commandsOfType('subscribe').length).toBeGreaterThan(1)

    MockWebSocket.last.confirmSubscription(channel.identifier)
    const afterConfirmation = MockWebSocket.last.commandsOfType('subscribe').length
    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval * 5)

    expect(MockWebSocket.last.commandsOfType('subscribe')).toHaveLength(afterConfirmation)
  })

  it('reports a rejected subscription and stops tracking it', () => {
    MockWebSocket.autoConfirmSubscriptions = false
    const { consumer, channel, events } = subscribe()

    MockWebSocket.last.rejectSubscription(channel.identifier)

    expect(events).toContainEqual(['rejected', undefined])
    expect(consumer.subscriptions.subscriptions).toHaveLength(0)
    expect(consumer.subscriptions.guarantor.pendingSubscriptions).toHaveLength(0)
  })

  it('stops reconnecting when the server disconnects for good', () => {
    const { consumer, events } = subscribe()

    MockWebSocket.last.deliver({ type: 'disconnect', reason: 'unauthorized', reconnect: false })

    expect(events).toContainEqual(['disconnected', expect.objectContaining({ willAttemptReconnect: false })])

    letTheMonitorReconnect()

    expect(MockWebSocket.instances).toHaveLength(1)
    expect(consumer.connection.isActive()).toBe(false)
  })

  it('surfaces socket errors to subscriptions', () => {
    const { events } = subscribe()
    const failure = new Error('network down')

    MockWebSocket.last.fail(failure)

    expect(events).toContainEqual(['error', { message: 'network down', event: failure }])
  })

  it('keeps working when the server broadcasts unusual payloads', () => {
    const { channel, events } = subscribe()

    expect(() => {
      MockWebSocket.last.broadcast(channel.identifier, null)
      MockWebSocket.last.broadcast(channel.identifier, 'a plain string')
      MockWebSocket.last.broadcast(channel.identifier, [1, 2, 3])
      MockWebSocket.last.deliverRaw(JSON.stringify({ identifier: channel.identifier }))
    }).not.toThrow()

    expect(events.filter(([name]) => name === 'received')).toEqual([
      ['received', { action: 'received' }],
      ['received', 'a plain string'],
      ['received', [1, 2, 3]],
      ['received', { action: 'received' }],
    ])
  })

  it('does not throw when sending while the connection is down', () => {
    const { consumer, channel } = subscribe()
    consumer.disconnect()

    expect(() => channel.perform('speak', { text: 'nobody listening' })).not.toThrow()
    expect(consumer.send({ command: 'message' })).toBe(false)
  })

  it('resubscribes every channel after a reconnect', () => {
    const consumer = ActionCable.createConsumer('wss://example.com/cable')
    const chat = consumer.subscriptions.create('ChatChannel')
    const inbox = consumer.subscriptions.create('InboxChannel')
    flushSocketWork()

    MockWebSocket.last.drop()
    letTheMonitorReconnect()

    expect(MockWebSocket.last.commandsOfType('subscribe').map(c => c.identifier)).toEqual([
      chat.identifier,
      inbox.identifier,
    ])
  })
})
