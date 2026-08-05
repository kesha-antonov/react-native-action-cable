import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'
import type {
  ConnectedPayload,
  Consumer,
  DisconnectedPayload,
  Subscription,
  SubscriptionError,
} from '@kesha-antonov/react-native-action-cable'

type MessageListener = (data: MessageData) => void
type StatusListener = (connected: boolean, message: string) => void

interface MessageData {
  type: string
  message?: string
  username?: string
  timestamp?: string
  [key: string]: unknown
}

class ChatService {
  private actionCable: Consumer | null = null
  private cable: Cable
  private channel: Subscription | null = null
  private _isConnected: boolean = false
  private messageListeners: MessageListener[] = []
  private statusListeners: StatusListener[] = []
  // Messages typed before the connection was ready, delivered on connect
  private pendingMessages: Array<{ message: string; username: string }> = []
  private room: string = 'general'

  // WebSocket URL for the Rails backend. Override it by exporting
  // EXPO_PUBLIC_CABLE_URL before starting the app, e.g.
  //   EXPO_PUBLIC_CABLE_URL=ws://192.168.0.10:3000/cable yarn start
  private WEBSOCKET_URL: string = process.env.EXPO_PUBLIC_CABLE_URL ?? 'ws://localhost:3000/cable'

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
      this.actionCable = ActionCable.createConsumer(this.WEBSOCKET_URL)

      // Create subscription to ChatChannel
      const subscription = this.actionCable.subscriptions.create({
        channel: 'ChatChannel',
        room: this.room,
      })

      // Set up the channel with Cable wrapper (setChannel returns the channel)
      const channel: Subscription = this.cable.setChannel('ChatChannel', subscription)
      this.channel = channel

      // Set up event listeners
      channel
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

  // Send a message, or queue it until the connection is back
  sendMessage(message: string, username: string = 'Anonymous'): void {
    if (this.channel && this._isConnected) {
      this.channel.perform('send_message', {
        message: message,
        username: username,
      })
      console.log('Message sent:', message)
      return
    }

    this.pendingMessages.push({ message, username })
    console.log('Message queued until the connection is back:', message)
  }

  /** Delivers everything typed while the connection was down, in order. */
  private flushPendingMessages(): void {
    if (this.pendingMessages.length === 0) return
    if (!this.channel || !this._isConnected) return

    const queued = this.pendingMessages
    this.pendingMessages = []
    console.log(`Delivering ${queued.length} queued message(s)`)
    queued.forEach(({ message, username }) => this.sendMessage(message, username))
  }

  get queuedMessageCount(): number {
    return this.pendingMessages.length
  }

  // Event handlers
  private handleConnected(payload?: ConnectedPayload): void {
    this._isConnected = true
    console.log(payload?.reconnected ? 'ActionCable reconnected' : 'ActionCable connected')
    this.notifyStatusListeners(true, payload?.reconnected ? 'Reconnected' : 'Connected')
    this.flushPendingMessages()
  }

  private handleDisconnected(payload?: DisconnectedPayload): void {
    this._isConnected = false
    // React Native reports why the socket dropped through the close reason
    const reason = payload?.reason
    console.log('ActionCable disconnected', reason ?? '')
    this.notifyStatusListeners(
      false,
      payload?.willAttemptReconnect ? 'Reconnecting...' : reason || 'Disconnected',
    )
  }

  private handleReceived(data: unknown): void {
    console.log('Message received:', data)
    this.notifyMessageListeners(data as MessageData)
  }

  private handleRejected(): void {
    console.log('ActionCable subscription rejected')
    this.notifyStatusListeners(false, 'Connection rejected')
  }

  private handleError(error: SubscriptionError): void {
    // A dropped connection is routine (server down, no network), and the
    // monitor retries on its own - warn instead of shouting through console.error
    console.warn(`ActionCable error: ${error?.message ?? 'unknown error'}`)
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
