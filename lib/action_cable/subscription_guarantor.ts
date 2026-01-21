import Subscription from './subscription'

export type LogFunction = (...args: unknown[]) => void

export interface Subscriptions {
  subscribe(subscription: Subscription): void
}

/**
 * SubscriptionGuarantor ensures subscriptions are reliably established.
 * It retries subscription requests when the server does not confirm them within a timeout.
 */
class SubscriptionGuarantor {
  static readonly retryInterval = 500

  subscriptions: Subscriptions
  pendingSubscriptions: Subscription[] = []
  retryTimeout?: ReturnType<typeof setTimeout>

  constructor(subscriptions: Subscriptions) {
    this.subscriptions = subscriptions
  }

  guarantee = (subscription: Subscription): void => {
    if (!this.pendingSubscriptions.includes(subscription)) {
      this.pendingSubscriptions.push(subscription)
    }
    this.startRetrying()
  }

  forget = (subscription: Subscription): void => {
    this.pendingSubscriptions = this.pendingSubscriptions.filter(s => s !== subscription)
  }

  // Private

  startRetrying = (): void => {
    if (!this.retryTimeout) {
      this.retryTimeout = setTimeout(() => {
        this.retryTimeout = undefined
        this.retrySubscribing()
      }, SubscriptionGuarantor.retryInterval)
    }
  }

  stopRetrying = (): void => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = undefined
    }
  }

  retrySubscribing = (): void => {
    for (const subscription of this.pendingSubscriptions) {
      this.subscriptions.subscribe(subscription)
    }
    if (this.pendingSubscriptions.length > 0) {
      this.startRetrying()
    }
  }
}

export default SubscriptionGuarantor
