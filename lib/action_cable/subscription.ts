const EventEmitter = require('eventemitter3');

interface SubscriptionParams {
  [key: string]: any;
}

interface Consumer {
  send: (data: any) => void;
  subscriptions: {
    remove: (subscription: Subscription) => void;
  };
}

class Subscription extends EventEmitter {
  private consumer: Consumer;
  public identifier: string;

  constructor(consumer: Consumer, params: SubscriptionParams = {}) {
    super();
    this.consumer = consumer;
    this.identifier = JSON.stringify(params);
  }

  // NOTE: PERFORM A CHANNEL ACTION WITH THE OPTIONAL DATA PASSED AS AN ATTRIBUTE
  perform = (action: string, data: any = {}) => {
    data.action = action;
    this.send(data);
  }

  send = (data: any) => {
    this.consumer.send({
      command: 'message',
      identifier: this.identifier,
      data: JSON.stringify(data)
    });
  }

  unsubscribe = () => {
    this.consumer.subscriptions.remove(this);
  }

  connected = () => {
    this.emit('connected');
  }

  disconnected = () => {
    this.emit('disconnected');
  }

  rejected = () => {
    this.emit('rejected');
  }

  error = (error: any) => {
    this.emit('error', error);
  }

  received = (data: any = {}) => {
    data.action = data.action != null ? data.action : 'received';
    this.emit(data.action, data);
  }
}

export default Subscription;