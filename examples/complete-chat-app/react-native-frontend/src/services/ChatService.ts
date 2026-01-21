import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'

type MessageListener = (data: MessageData) => void
type StatusListener = (connected: boolean, message: string) => void

interface MessageData {
  type: string
  message?: string
  username?: string
  timestamp?: string
  [key: string]: unknown
}

interface Channel {
  on: (event: string, callback: (data?: unknown) => void) => Channel
  removeListener: (event: string, callback: (data?: unknown) => void) => Channel
  perform: (action: string, data: Record<string, unknown>) => void
  unsubscribe: () => void
}

interface Consumer {
  subscriptions: {
    create: (params: Record<string, unknown>) => Channel
  }
  disconnect: () => void
}

class ChatService {
  private actionCable: Consumer | null = null
  private cable: Cable
  private channel: Channel | null = null
  private _isConnected: boolean = false
  private messageListeners: MessageListener[] = []
  private statusListeners: StatusListener[] = []
  private room: string = 'general'

  // WebSocket URL for the Rails backend
  private WEBSOCKET_URL: string = 'ws://localhost:3000/cable'

  constructor() {
    this.cable = new Cable({})
  }

  // Initialize ActionCable connection
  connect(): void {
    if (this.actionCable) {
      console.log('ActionCable already connected')
      return
    }

    try {
      // Create ActionCable consumer
      this.actionCable = ActionCable.createConsumer(this.WEBSOCKET_URL) as Consumer

      // Create subscription to ChatChannel
      const subscription = this.actionCable.subscriptions.create({
        channel: 'ChatChannel',
        room: this.room,
      })

      // Set up the channel with Cable wrapper
      this.channel = this.cable.setChannel('ChatChannel', subscription) as unknown as Channel

      // Set up event listeners
      this.channel
        .on('connected', this.handleConnected.bind(this))
        .on('disconnected', this.handleDisconnected.bind(this))
        .on('received', this.handleReceived.bind(this))
        .on('rejected', this.handleRejected.bind(this))
        .on('error', this.handleError.bind(this))

      console.log('ActionCable connection initiated')
    } catch (error) {
      console.error('Failed to connect to ActionCable:', error)
      this.notifyStatusListeners(false, 'Connection failed')
    }
  }

  // Disconnect from ActionCable
  disconnect(): void {
    if (this.channel) {
      this.channel
        .removeListener('connected', this.handleConnected)
        .removeListener('disconnected', this.handleDisconnected)
        .removeListener('received', this.handleReceived)
        .removeListener('rejected', this.handleRejected)
        .removeListener('error', this.handleError)

      this.channel.unsubscribe()
      this.channel = null
    }

    if (this.actionCable) {
      this.actionCable.disconnect()
      this.actionCable = null
    }

    this._isConnected = false
    this.notifyStatusListeners(false, 'Disconnected')
    console.log('ActionCable disconnected')
  }

  // Send a message
  sendMessage(message: string, username: string = 'Anonymous'): void {
    if (this.channel && this._isConnected) {
      this.channel.perform('send_message', {
        message: message,
        username: username,
      })
      console.log('Message sent:', message)
    } else {
      console.error('Cannot send message: not connected to ActionCable')
    }
  }

  // Event handlers
  private handleConnected(): void {
    this._isConnected = true
    console.log('ActionCable connected')
    this.notifyStatusListeners(true, 'Connected')
  }

  private handleDisconnected(): void {
    this._isConnected = false
    console.log('ActionCable disconnected')
    this.notifyStatusListeners(false, 'Disconnected')
  }

  private handleReceived(data: unknown): void {
    console.log('Message received:', data)
    this.notifyMessageListeners(data as MessageData)
  }

  private handleRejected(): void {
    console.log('ActionCable subscription rejected')
    this.notifyStatusListeners(false, 'Connection rejected')
  }

  private handleError(error: unknown): void {
    console.error('ActionCable error:', error)
    this.notifyStatusListeners(false, 'Connection error')
  }

  // Listener management
  addMessageListener(callback: MessageListener): void {
    this.messageListeners.push(callback)
  }

  removeMessageListener(callback: MessageListener): void {
    this.messageListeners = this.messageListeners.filter(l => l !== callback)
  }

  addStatusListener(callback: StatusListener): void {
    this.statusListeners.push(callback)
  }

  removeStatusListener(callback: StatusListener): void {
    this.statusListeners = this.statusListeners.filter(l => l !== callback)
  }

  // Notify listeners
  private notifyMessageListeners(data: MessageData): void {
    this.messageListeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in message listener:', error)
      }
    })
  }

  private notifyStatusListeners(connected: boolean, message: string = ''): void {
    this.statusListeners.forEach(callback => {
      try {
        callback(connected, message)
      } catch (error) {
        console.error('Error in status listener:', error)
      }
    })
  }

  // Getters
  get isConnected(): boolean {
    return this._isConnected
  }

  getConnectionStatus(): boolean {
    return this._isConnected
  }
}

// Export a singleton instance
export default new ChatService()
