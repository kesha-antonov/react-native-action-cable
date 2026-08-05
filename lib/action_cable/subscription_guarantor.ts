import Subscription from './subscription'

export type LogFunction = (...args: unknown[]) => void

export interface Subscriptions {
  subscribe(subscription: Subscription): void
}

/**
 * Responsible for ensuring channel subscribe command is confirmed, retrying
 * until confirmation is received. Internal class, not intended for direct user
 * manipulation.
 */
class SubscriptionGuarantor {
  static readonly retryInterval = 500

  subscriptions: Subscriptions
  log: LogFunction
  pendingSubscriptions: Subscription[] = []
  retryTimeout?: ReturnType<typeof setTimeout>

  constructor(subscriptions: Subscriptions, log: LogFunction = () => {}) {
    this.subscriptions = subscriptions
    this.log = log
  }

  guarantee = (subscription: Subscription): void => {
    if (!this.pendingSubscriptions.includes(subscription)) {
      this.log(`SubscriptionGuarantor guaranteeing ${subscription.identifier}`)
      this.pendingSubscriptions.push(subscription)
    } else {
      this.log(`SubscriptionGuarantor already guaranteeing ${subscription.identifier}`)
    }
    this.startGuaranteeing()
  }

  forget = (subscription: Subscription): void => {
    this.log(`SubscriptionGuarantor forgetting ${subscription.identifier}`)
    this.pendingSubscriptions = this.pendingSubscriptions.filter(s => s !== subscription)
  }

  // Private

  startGuaranteeing = (): void => {
    this.stopGuaranteeing()
    this.retrySubscribing()
  }

  stopGuaranteeing = (): void => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = undefined
    }
  }

  retrySubscribing = (): void => {
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = undefined
      if (typeof this.subscriptions?.subscribe === 'function') {
        for (const subscription of this.pendingSubscriptions) {
          this.log(`SubscriptionGuarantor resubscribing ${subscription.identifier}`)
          this.subscriptions.subscribe(subscription)
        }
      }
    }, SubscriptionGuarantor.retryInterval)
  }
}

export default SubscriptionGuarantor
