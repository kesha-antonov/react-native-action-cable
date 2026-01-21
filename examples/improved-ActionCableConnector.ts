/**
 * Example showing how to prevent multiple ActionCable connections
 *
 * This demonstrates the solution to the issue where apps were connecting
 * to ActionCable multiple times on restart/hot reload.
 *
 * The key changes from the original issue:
 * 1. Use ActionCable.getOrCreateConsumer() instead of ActionCable.createConsumer()
 * 2. This automatically reuses existing connections for the same URL
 * 3. Add proper cleanup in component unmounting
 */

import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'

// These would be imported from your app
declare const WEB_SOCKET_URL: string
declare function getPubSubToken(): Promise<string>
declare function addMessageToConversation(payload: { message: Message }): void
declare const store: { dispatch: (action: unknown) => void }

interface Message {
  id: string
  content: string
  [key: string]: unknown
}

interface ReceivedData {
  event?: string
  data?: unknown
}

type EventHandler = (data: unknown) => void

// Use getOrCreateConsumer instead of createConsumer to prevent duplicates
const connectActionCable = ActionCable.getOrCreateConsumer(WEB_SOCKET_URL)

const cable = new Cable({})

class ActionCableConnector {
  private channel: ReturnType<Cable['setChannel']>
  private events: Record<string, EventHandler>

  constructor(pubSubToken: string) {
    const channel = cable.setChannel(
      'RoomChannel',
      connectActionCable.subscriptions.create({
        channel: 'RoomChannel',
        pubsub_token: pubSubToken,
      })
    )

    channel.on('received', this.onReceived)

    this.events = {
      messageCreated: this.onMessageCreated,
    }

    // Store channel reference for cleanup
    this.channel = channel
  }

  onReceived = ({ event, data }: ReceivedData = {}): void => {
    if (event && this.events[event] && typeof this.events[event] === 'function') {
      this.events[event](data)
    }
  }

  onMessageCreated = (message: unknown): void => {
    store.dispatch(addMessageToConversation({ message: message as Message }))
  }

  // Add cleanup method
  disconnect(): void {
    if (this.channel) {
      this.channel.removeListener('received', this.onReceived)
      this.channel.unsubscribe()
    }
  }
}

let actionCableInstance: ActionCableConnector | null = null

export async function initActionCable(): Promise<ActionCableConnector> {
  // Clean up existing instance if it exists
  if (actionCableInstance) {
    actionCableInstance.disconnect()
  }

  const pubSubToken = await getPubSubToken()
  actionCableInstance = new ActionCableConnector(pubSubToken)
  return actionCableInstance
}

// Optional: Add cleanup function that can be called from your root component
export function cleanupActionCable(): void {
  if (actionCableInstance) {
    actionCableInstance.disconnect()
    actionCableInstance = null
  }

  // Optionally disconnect the consumer entirely
  // ActionCable.disconnectConsumer(WEB_SOCKET_URL);
}
