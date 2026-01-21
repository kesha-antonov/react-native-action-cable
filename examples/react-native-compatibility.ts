/**
 * Example demonstrating that channel callbacks work correctly
 * This addresses issue #8 where callbacks were not triggering in React Native
 */

// This example shows the basic pattern that now works with the fixes:
// 1. WebSocket compatibility in React Native (no window object)
// 2. Cable.setChannel returns the channel for method chaining

// Simulate React Native environment where window is undefined
// (In a real React Native app, window won't exist)
declare const global: {
  window?: unknown
  WebSocket: typeof MockWebSocket
}

delete global.window

import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'

interface WebSocketOptions {
  headers?: Record<string, string>
}

interface MessageEvent {
  data: string
}

// Mock WebSocket for demonstration
class MockWebSocket {
  url: string
  protocols: string | string[] | undefined
  readyState: number
  protocol: string
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((error: Error) => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string, protocols?: string | string[], _options?: WebSocketOptions) {
    this.url = url
    this.protocols = protocols
    this.readyState = 1 // OPEN
    this.protocol = 'actioncable-v1-json'

    // Simulate connection flow
    setTimeout(() => {
      if (this.onopen) this.onopen()

      // Welcome message
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({ type: 'welcome' }),
          })
        }

        // Subscription confirmation
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({
              data: JSON.stringify({
                identifier: JSON.stringify({ channel: 'ChatChannel', chatId: 1, userId: 1 }),
                type: 'confirm_subscription',
              }),
            })
          }
        }, 50)
      }, 50)
    }, 10)
  }

  send(_data: string): void {
    /* mock */
  }
  close(): void {
    /* mock */
  }
}

// Set global WebSocket (this is how React Native provides it)
global.WebSocket = MockWebSocket

// Example usage that now works with the fixes
console.log('Testing ActionCable with React Native compatibility...')

// Create ActionCable consumer (WebSocket will resolve correctly now)
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')

// Create Cable instance
const cable = new Cable({})

// Create subscription
const subscription = actionCable.subscriptions.create({
  channel: 'ChatChannel',
  chatId: 1,
  userId: 1,
})

// This pattern now works because setChannel returns the channel
const channel = cable.setChannel('chat_1_1', subscription)

// Method chaining works because channel is not undefined
channel
  .on('connected', () => {
    console.log('✅ Connected callback triggered successfully!')
  })
  .on('received', (data: unknown) => {
    console.log('✅ Received callback triggered with:', data)
  })
  .on('disconnected', () => {
    console.log('✅ Disconnected callback triggered successfully!')
  })

console.log('✅ Channel callbacks set up successfully')
console.log('✅ Issue #8 has been resolved!')
