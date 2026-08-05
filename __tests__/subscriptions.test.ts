import Subscriptions from '../lib/action_cable/subscriptions'
import type { Consumer } from '../lib/action_cable/subscriptions'
import SubscriptionGuarantor from '../lib/action_cable/subscription_guarantor'

function buildSubscriptions(sendResult = true) {
  const send = jest.fn(() => sendResult)
  const ensureActiveConnection = jest.fn()
  const consumer = {
    send,
    ensureActiveConnection,
    subscriptions: { remove: jest.fn() },
  } as unknown as Consumer
  const log = jest.fn()
  const subscriptions = new Subscriptions(consumer, log)
  // The consumer delegates removal back to the collection, as Consumer does
  ;(consumer.subscriptions.remove as jest.Mock).mockImplementation(subscriptions.remove)
  return { subscriptions, send, ensureActiveConnection, log }
}

describe('Subscriptions', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('create', () => {
    it('accepts a channel name', () => {
      const { subscriptions } = buildSubscriptions()

      const subscription = subscriptions.create('ChatChannel')

      expect(subscription.identifier).toBe('{"channel":"ChatChannel"}')
    })

    it('accepts channel params', () => {
      const { subscriptions } = buildSubscriptions()

      const subscription = subscriptions.create({ channel: 'ChatChannel', roomId: 7 })

      expect(subscription.identifier).toBe('{"channel":"ChatChannel","roomId":7}')
    })

    it('ensures the connection is active and sends a subscribe command', () => {
      const { subscriptions, send, ensureActiveConnection } = buildSubscriptions()

      const subscription = subscriptions.create('ChatChannel')

      expect(ensureActiveConnection).toHaveBeenCalledTimes(1)
      expect(send).toHaveBeenCalledWith({ command: 'subscribe', identifier: subscription.identifier })
    })

    it('accepts a Rails style mixin of channel callbacks', () => {
      const { subscriptions } = buildSubscriptions()
      const received = jest.fn()
      const connected = jest.fn()

      const subscription = subscriptions.create('ChatChannel', {
        received,
        connected,
        appear() {
          this.perform('appear', { appearing_on: 'the index' })
        },
      })
      subscriptions.notify(subscription, 'connected', { reconnected: false })
      subscriptions.notify(subscription, 'received', { text: 'hello' })

      expect(connected).toHaveBeenCalledWith({ reconnected: false })
      expect(received).toHaveBeenCalledWith({ text: 'hello' })
      expect(typeof (subscription as unknown as { appear: unknown }).appear).toBe('function')
    })

    it('keeps the event emitter API when no mixin is given', () => {
      const { subscriptions } = buildSubscriptions()
      const subscription = subscriptions.create('ChatChannel')
      const listener = jest.fn()
      subscription.on('received', listener)

      subscriptions.notify(subscription, 'received', { text: 'hello' })

      expect(listener).toHaveBeenCalledWith({ text: 'hello', action: 'received' })
    })

    it('notifies the subscription that it was initialized', () => {
      const { subscriptions } = buildSubscriptions()
      const notify = jest.spyOn(subscriptions, 'notify')

      const subscription = subscriptions.create('ChatChannel')

      expect(notify).toHaveBeenCalledWith(subscription, 'initialized')
    })
  })

  describe('remove', () => {
    it('forgets the subscription and unsubscribes on the server', () => {
      const { subscriptions, send } = buildSubscriptions()
      const subscription = subscriptions.create('ChatChannel')
      send.mockClear()

      subscriptions.remove(subscription)

      expect(subscriptions.subscriptions).toHaveLength(0)
      expect(send).toHaveBeenCalledWith({ command: 'unsubscribe', identifier: subscription.identifier })
    })

    it('keeps the server subscription while another local subscription shares the identifier', () => {
      const { subscriptions, send } = buildSubscriptions()
      const first = subscriptions.create('ChatChannel')
      subscriptions.create('ChatChannel')
      send.mockClear()

      subscriptions.remove(first)

      expect(subscriptions.subscriptions).toHaveLength(1)
      expect(send).not.toHaveBeenCalledWith({ command: 'unsubscribe', identifier: first.identifier })
    })

    it('is reachable through the subscription itself', () => {
      const { subscriptions, send } = buildSubscriptions()
      const subscription = subscriptions.create('ChatChannel')
      send.mockClear()

      subscription.unsubscribe()

      expect(subscriptions.subscriptions).toHaveLength(0)
      expect(send).toHaveBeenCalledWith({ command: 'unsubscribe', identifier: subscription.identifier })
    })
  })

  describe('reject', () => {
    it('forgets every subscription with the identifier and notifies them', () => {
      const { subscriptions } = buildSubscriptions()
      const subscription = subscriptions.create('ChatChannel')
      const rejected = jest.fn()
      subscription.on('rejected', rejected)

      const result = subscriptions.reject(subscription.identifier)

      expect(result).toEqual([subscription])
      expect(rejected).toHaveBeenCalledTimes(1)
      expect(subscriptions.subscriptions).toHaveLength(0)
    })
  })

  describe('notify', () => {
    it('notifies a single subscription', () => {
      const { subscriptions } = buildSubscriptions()
      const subscription = subscriptions.create('ChatChannel')
      const connected = jest.fn()
      subscription.on('connected', connected)

      subscriptions.notify(subscription, 'connected', { reconnected: false })

      expect(connected).toHaveBeenCalledWith({ reconnected: false })
    })

    it('notifies every subscription matching an identifier', () => {
      const { subscriptions } = buildSubscriptions()
      const first = subscriptions.create('ChatChannel')
      const second = subscriptions.create('ChatChannel')
      const listeners = [jest.fn(), jest.fn()]
      first.on('received', listeners[0])
      second.on('received', listeners[1])

      subscriptions.notify(first.identifier, 'received', { text: 'hello' })

      expect(listeners[0]).toHaveBeenCalledWith({ text: 'hello', action: 'received' })
      expect(listeners[1]).toHaveBeenCalledWith({ text: 'hello', action: 'received' })
    })

    it('regression: a broadcast is not mutated between subscriptions sharing an identifier', () => {
      const { subscriptions } = buildSubscriptions()
      subscriptions.create('ChatChannel')
      subscriptions.create('ChatChannel')
      const message = { text: 'hello' }

      subscriptions.notify('{"channel":"ChatChannel"}', 'received', message)

      expect(message).toEqual({ text: 'hello' })
    })

    it('ignores callbacks the subscription does not implement', () => {
      const { subscriptions } = buildSubscriptions()
      const subscription = subscriptions.create('ChatChannel')

      expect(() => subscriptions.notify(subscription, 'somethingElse')).not.toThrow()
    })

    it('notifies all subscriptions regardless of identifier', () => {
      const { subscriptions } = buildSubscriptions()
      const chat = subscriptions.create('ChatChannel')
      const inbox = subscriptions.create('InboxChannel')
      const listeners = [jest.fn(), jest.fn()]
      chat.on('disconnected', listeners[0])
      inbox.on('disconnected', listeners[1])

      subscriptions.notifyAll('disconnected', { willAttemptReconnect: true })

      expect(listeners[0]).toHaveBeenCalledWith({ willAttemptReconnect: true })
      expect(listeners[1]).toHaveBeenCalledWith({ willAttemptReconnect: true })
    })
  })

  describe('reload', () => {
    it('re-subscribes every subscription', () => {
      const { subscriptions, send } = buildSubscriptions()
      const chat = subscriptions.create('ChatChannel')
      const inbox = subscriptions.create('InboxChannel')
      send.mockClear()

      subscriptions.reload()

      expect(send).toHaveBeenCalledWith({ command: 'subscribe', identifier: chat.identifier })
      expect(send).toHaveBeenCalledWith({ command: 'subscribe', identifier: inbox.identifier })
    })
  })

  describe('confirmSubscription', () => {
    it('stops guaranteeing a confirmed subscription', () => {
      const { subscriptions, send } = buildSubscriptions()
      const subscription = subscriptions.create('ChatChannel')
      expect(subscriptions.guarantor.pendingSubscriptions).toContain(subscription)

      subscriptions.confirmSubscription(subscription.identifier)
      send.mockClear()
      jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval * 4)

      expect(subscriptions.guarantor.pendingSubscriptions).toHaveLength(0)
      expect(send).not.toHaveBeenCalled()
    })
  })

  describe('findAll', () => {
    it('returns every subscription with the given identifier', () => {
      const { subscriptions } = buildSubscriptions()
      const first = subscriptions.create('ChatChannel')
      const second = subscriptions.create('ChatChannel')
      subscriptions.create('InboxChannel')

      expect(subscriptions.findAll(first.identifier)).toEqual([first, second])
      expect(subscriptions.findAll('{"channel":"Unknown"}')).toEqual([])
    })
  })

  describe('when the connection is down', () => {
    it('does not guarantee a subscription that could not be sent', () => {
      const { subscriptions } = buildSubscriptions(false)

      const subscription = subscriptions.create('ChatChannel')

      expect(subscriptions.guarantor.pendingSubscriptions).not.toContain(subscription)
    })
  })
})
