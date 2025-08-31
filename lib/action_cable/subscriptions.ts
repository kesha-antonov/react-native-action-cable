const INTERNAL = require('./internal').default;
const Subscription = require('./subscription').default;

interface ChannelParams {
  channel: string;
  [key: string]: any;
}

class Subscriptions {
  private consumer: any;
  private subscriptions: any[] = [];

  constructor(consumer: any) {
    this.consumer = consumer;
  }

  create = (channelName: string | ChannelParams) => {
    const channel = channelName;
    const params = typeof channel === 'object' ? channel : { channel };
    const subscription = new Subscription(this.consumer, params);
    return this.add(subscription);
  }

  // Private

  add = (subscription: any) => {
    this.subscriptions.push(subscription);
    this.consumer.ensureActiveConnection();
    this.notify(subscription, "initialized");
    this.sendCommand(subscription, "subscribe");
    return subscription;
  }

  remove = (subscription: any) => {
    this.forget(subscription);
    if (!this.findAll(subscription.identifier).length) {
      this.sendCommand(subscription, "unsubscribe");
    }
    return subscription;
  }

  reject = (identifier: string) => {
    const subscriptions = this.findAll(identifier);
    for (const subscription of subscriptions) {
      this.forget(subscription);
      this.notify(subscription, "rejected");
    }
    return subscriptions;
  }

  forget = (subscription: any) => {
    this.subscriptions = this.subscriptions.filter(s => s !== subscription);
    return subscription;
  }

  findAll = (identifier: string) => {
    return this.subscriptions.filter(s => s.identifier === identifier);
  }

  reload = () => {
    for (const subscription of this.subscriptions) {
      this.sendCommand(subscription, "subscribe");
    }
  }

  notifyAll = (callbackName: string, ...args: any[]) => {
    for (const subscription of this.subscriptions) {
      this.notify(subscription, callbackName, ...args);
    }
  }

  notify = (subscription: any, callbackName: string, ...args: any[]) => {
    let subscriptions: any[];
    if (typeof subscription === "string") {
      subscriptions = this.findAll(subscription);
    } else {
      subscriptions = [subscription];
    }

    for (const sub of subscriptions) {
      if (typeof sub[callbackName] === 'function') {
        sub[callbackName](...args);
      }
    }
  }

  sendCommand = (subscription: any, command: string) => {
    const { identifier } = subscription;
    this.consumer.send({ command, identifier });
  }
}

export default Subscriptions;