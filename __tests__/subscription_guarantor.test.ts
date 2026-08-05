import SubscriptionGuarantor from '../lib/action_cable/subscription_guarantor'
import Subscription from '../lib/action_cable/subscription'
import type { SubscriptionConsumer } from '../lib/action_cable/subscription'

function buildSubscription(channel: string): Subscription {
  const consumer: SubscriptionConsumer = { send: jest.fn(), subscriptions: { remove: jest.fn() } }
  return new Subscription(consumer, { channel })
}

function buildGuarantor() {
  const subscribe = jest.fn()
  const log = jest.fn()
  const guarantor = new SubscriptionGuarantor({ subscribe }, log)
  return { guarantor, subscribe, log }
}

describe('SubscriptionGuarantor', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('resubscribes once the retry interval has passed', () => {
    const { guarantor, subscribe } = buildGuarantor()
    const subscription = buildSubscription('ChatChannel')

    guarantor.guarantee(subscription)
    expect(subscribe).not.toHaveBeenCalled()

    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval)

    expect(subscribe).toHaveBeenCalledWith(subscription)
  })

  it('keeps retrying as long as the subscription stays unconfirmed', () => {
    const { guarantor, subscribe } = buildGuarantor()
    const subscription = buildSubscription('ChatChannel')
    // A successful `subscribe` guarantees the subscription again, which is what
    // keeps the retry loop alive - exactly as Subscriptions#subscribe does
    subscribe.mockImplementation(s => guarantor.guarantee(s))

    guarantor.guarantee(subscription)
    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval * 4)
    expect(subscribe).toHaveBeenCalledTimes(4)

    guarantor.forget(subscription)
    subscribe.mockClear()
    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval * 5)
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('stops retrying when the subscribe command could not be sent', () => {
    const { guarantor, subscribe } = buildGuarantor()
    const subscription = buildSubscription('ChatChannel')

    guarantor.guarantee(subscription)
    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval * 5)

    // Nothing guaranteed it again, so a reconnect (which reloads every
    // subscription) is what will re-establish it
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(guarantor.pendingSubscriptions).toEqual([subscription])
  })

  it('restarts the retry timer on every guarantee', () => {
    const { guarantor, subscribe } = buildGuarantor()
    const chat = buildSubscription('ChatChannel')
    const inbox = buildSubscription('InboxChannel')

    guarantor.guarantee(chat)
    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval - 1)
    guarantor.guarantee(inbox)
    jest.advanceTimersByTime(1)
    expect(subscribe).not.toHaveBeenCalled()

    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval - 1)
    expect(subscribe).toHaveBeenCalledTimes(2)
  })

  it('never guarantees the same subscription twice', () => {
    const { guarantor, subscribe } = buildGuarantor()
    const subscription = buildSubscription('ChatChannel')

    guarantor.guarantee(subscription)
    guarantor.guarantee(subscription)
    guarantor.guarantee(subscription)

    expect(guarantor.pendingSubscriptions).toEqual([subscription])

    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval)
    expect(subscribe).toHaveBeenCalledTimes(1)
  })

  it('retries every pending subscription on the same tick', () => {
    const { guarantor, subscribe } = buildGuarantor()
    const chat = buildSubscription('ChatChannel')
    const inbox = buildSubscription('InboxChannel')

    guarantor.guarantee(chat)
    guarantor.guarantee(inbox)
    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval)

    expect(subscribe).toHaveBeenCalledWith(chat)
    expect(subscribe).toHaveBeenCalledWith(inbox)
  })

  it('stops guaranteeing when asked to', () => {
    const { guarantor, subscribe } = buildGuarantor()
    guarantor.guarantee(buildSubscription('ChatChannel'))

    guarantor.stopGuaranteeing()
    jest.advanceTimersByTime(SubscriptionGuarantor.retryInterval * 5)

    expect(subscribe).not.toHaveBeenCalled()
  })

  it('forgetting an unknown subscription is a no-op', () => {
    const { guarantor } = buildGuarantor()
    const subscription = buildSubscription('ChatChannel')
    guarantor.guarantee(subscription)

    guarantor.forget(buildSubscription('OtherChannel'))

    expect(guarantor.pendingSubscriptions).toEqual([subscription])
  })
})
