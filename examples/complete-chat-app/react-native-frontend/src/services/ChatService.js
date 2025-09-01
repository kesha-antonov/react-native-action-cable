import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable';

class ChatService {
  constructor() {
    this.actionCable = null;
    this.cable = new Cable({});
    this.channel = null;
    this.isConnected = false;
    this.messageListeners = [];
    this.statusListeners = [];
    this.room = 'general';
    
    // WebSocket URL for the Rails backend
    this.WEBSOCKET_URL = 'ws://localhost:3000/cable';
  }

  // Initialize ActionCable connection
  connect() {
    if (this.actionCable) {
      console.log('ActionCable already connected');
      return;
    }

    try {
      // Create ActionCable consumer
      this.actionCable = ActionCable.createConsumer(this.WEBSOCKET_URL);
      
      // Create subscription to ChatChannel
      const subscription = this.actionCable.subscriptions.create({
        channel: 'ChatChannel',
        room: this.room,
      });

      // Set up the channel with Cable wrapper
      this.channel = this.cable.setChannel('ChatChannel', subscription);
      
      // Set up event listeners
      this.channel
        .on('connected', this.handleConnected.bind(this))
        .on('disconnected', this.handleDisconnected.bind(this))
        .on('received', this.handleReceived.bind(this))
        .on('rejected', this.handleRejected.bind(this))
        .on('error', this.handleError.bind(this));

      console.log('ActionCable connection initiated');
    } catch (error) {
      console.error('Failed to connect to ActionCable:', error);
      this.notifyStatusListeners(false, 'Connection failed');
    }
  }

  // Disconnect from ActionCable
  disconnect() {
    if (this.channel) {
      this.channel
        .removeListener('connected', this.handleConnected)
        .removeListener('disconnected', this.handleDisconnected)
        .removeListener('received', this.handleReceived)
        .removeListener('rejected', this.handleRejected)
        .removeListener('error', this.handleError);
      
      this.channel.unsubscribe();
      this.channel = null;
    }

    if (this.actionCable) {
      this.actionCable.disconnect();
      this.actionCable = null;
    }

    this.isConnected = false;
    this.notifyStatusListeners(false, 'Disconnected');
    console.log('ActionCable disconnected');
  }

  // Send a message
  sendMessage(message, username = 'Anonymous') {
    if (this.channel && this.isConnected) {
      this.channel.perform('send_message', {
        message: message,
        username: username,
      });
      console.log('Message sent:', message);
    } else {
      console.error('Cannot send message: not connected to ActionCable');
    }
  }

  // Event handlers
  handleConnected() {
    this.isConnected = true;
    console.log('ActionCable connected');
    this.notifyStatusListeners(true, 'Connected');
  }

  handleDisconnected() {
    this.isConnected = false;
    console.log('ActionCable disconnected');
    this.notifyStatusListeners(false, 'Disconnected');
  }

  handleReceived(data) {
    console.log('Message received:', data);
    this.notifyMessageListeners(data);
  }

  handleRejected() {
    console.log('ActionCable subscription rejected');
    this.notifyStatusListeners(false, 'Connection rejected');
  }

  handleError(error) {
    console.error('ActionCable error:', error);
    this.notifyStatusListeners(false, 'Connection error');
  }

  // Listener management
  addMessageListener(callback) {
    this.messageListeners.push(callback);
  }

  removeMessageListener(callback) {
    this.messageListeners = this.messageListeners.filter(l => l !== callback);
  }

  addStatusListener(callback) {
    this.statusListeners.push(callback);
  }

  removeStatusListener(callback) {
    this.statusListeners = this.statusListeners.filter(l => l !== callback);
  }

  // Notify listeners
  notifyMessageListeners(data) {
    this.messageListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  notifyStatusListeners(connected, message = '') {
    this.statusListeners.forEach(callback => {
      try {
        callback(connected, message);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  // Getters
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Export a singleton instance
export default new ChatService();