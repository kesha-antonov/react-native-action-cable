import Subscription from '../lib/action_cable/subscription'
import type { SubscriptionConsumer } from '../lib/action_cable/subscription'

function buildSubscription(params: Record<string, unknown> = { channel: 'ChatChannel', roomId: 1 }) {
  const remove = jest.fn()
  const send = jest.fn()
  const consumer: SubscriptionConsumer = { send, subscriptions: { remove } }
  const subscription = new Subscription(consumer, params)
  return { subscription, send, remove }
}

describe('Subscription', () => {
  it('derives its identifier from the channel params', () => {
    const { subscription } = buildSubscription()

    expect(subscription.identifier).toBe('{"channel":"ChatChannel","roomId":1}')
  })

  describe('perform', () => {
    it('sends the action along with the data', () => {
      const { subscription, send } = buildSubscription()

      subscription.perform('speak', { text: 'hello' })

      expect(send).toHaveBeenCalledWith({
        command: 'message',
        identifier: subscription.identifier,
        data: JSON.stringify({ text: 'hello', action: 'speak' }),
      })
    })

    it('works without data', () => {
      const { subscription, send } = buildSubscription()

      subscription.perform('ping')

      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        data: JSON.stringify({ action: 'ping' }),
      }))
    })

    it('regression: does not mutate the data passed by the caller', () => {
      const { subscription } = buildSubscription()
      const data = { text: 'hello' }

      subscription.perform('speak', data)

      expect(data).toEqual({ text: 'hello' })
    })

    it('regression: accepts a frozen payload', () => {
      const { subscription, send } = buildSubscription()

      expect(() => subscription.perform('speak', Object.freeze({ text: 'hello' }))).not.toThrow()
      expect(send).toHaveBeenCalled()
    })
  })

  describe('send', () => {
    it('wraps the data in a message command', () => {
      const { subscription, send } = buildSubscription()

      subscription.send({ text: 'hello' })

      expect(send).toHaveBeenCalledWith({
        command: 'message',
        identifier: subscription.identifier,
        data: JSON.stringify({ text: 'hello' }),
      })
    })
  })

  describe('unsubscribe', () => {
    it('asks the consumer to remove it', () => {
      const { subscription, remove } = buildSubscription()

      subscription.unsubscribe()

      expect(remove).toHaveBeenCalledWith(subscription)
    })
  })

  describe('received', () => {
    it('emits a received event for a message without an action', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('received', listener)

      subscription.received({ text: 'hello' })

      expect(listener).toHaveBeenCalledWith({ text: 'hello', action: 'received' })
    })

    it('emits a message carrying an action under that action name', () => {
      const { subscription } = buildSubscription()
      const speak = jest.fn()
      const received = jest.fn()
      subscription.on('speak', speak)
      subscription.on('received', received)

      subscription.received({ action: 'speak', text: 'hello' })

      expect(speak).toHaveBeenCalledWith({ action: 'speak', text: 'hello' })
      expect(received).not.toHaveBeenCalled()
    })

    it('regression: does not crash on a null message', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('received', listener)

      expect(() => subscription.received(null)).not.toThrow()
      expect(listener).toHaveBeenCalledWith({ action: 'received' })
    })

    it('regression: does not crash on a missing message', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('received', listener)

      expect(() => subscription.received(undefined)).not.toThrow()
      expect(listener).toHaveBeenCalledWith({ action: 'received' })
    })

    it('regression: passes primitive payloads through untouched', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('received', listener)

      subscription.received('a plain string')
      subscription.received(42)

      expect(listener).toHaveBeenNthCalledWith(1, 'a plain string')
      expect(listener).toHaveBeenNthCalledWith(2, 42)
    })

    it('regression: passes array payloads through untouched', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('received', listener)

      subscription.received([1, 2, 3])

      expect(listener).toHaveBeenCalledWith([1, 2, 3])
      expect(listener.mock.calls[0][0]).not.toHaveProperty('action')
    })

    it('regression: does not mutate the broadcast message', () => {
      const { subscription } = buildSubscription()
      const message = { text: 'hello' }

      subscription.received(message)

      expect(message).toEqual({ text: 'hello' })
    })
  })

  describe('connection callbacks', () => {
    it('regression: forwards the reconnected flag to connected listeners', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('connected', listener)

      subscription.connected({ reconnected: true })

      expect(listener).toHaveBeenCalledWith({ reconnected: true })
    })

    it('regression: forwards the reconnect intent to disconnected listeners', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('disconnected', listener)

      subscription.disconnected({ willAttemptReconnect: false })

      expect(listener).toHaveBeenCalledWith({ willAttemptReconnect: false })
    })

    it('emits rejected and error events', () => {
      const { subscription } = buildSubscription()
      const rejected = jest.fn()
      const errored = jest.fn()
      subscription.on('rejected', rejected)
      subscription.on('error', errored)
      const failure = new Error('boom')

      subscription.rejected()
      subscription.error(failure)

      expect(rejected).toHaveBeenCalledTimes(1)
      expect(errored).toHaveBeenCalledWith(failure)
    })

    it('supports removing listeners', () => {
      const { subscription } = buildSubscription()
      const listener = jest.fn()
      subscription.on('received', listener)
      subscription.removeListener('received', listener)

      subscription.received({ text: 'hello' })

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
