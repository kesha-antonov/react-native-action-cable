/**
 * Example Jest test file for components using ActionCable
 * This demonstrates different testing scenarios and best practices
 */

import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'
import { ChatComponent } from './ChatComponent'

// Import the Jest setup (or include it in your Jest setup files)
import './jest-setup'

interface MockSubscription {
  on: jest.Mock
  removeListener: jest.Mock
  perform: jest.Mock
  unsubscribe: jest.Mock
}

interface MockCableInstance {
  channels: Record<string, unknown>
  channel: jest.Mock
  setChannel: jest.Mock
}

describe('ChatComponent', () => {
  let mockActionCable: typeof ActionCable
  let mockCable: MockCableInstance
  let mockSubscription: MockSubscription
  let mockChannel: MockSubscription

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()

    // Get references to mocked objects for easier testing
    mockActionCable = ActionCable

    mockSubscription = {
      on: jest.fn().mockReturnThis(),
      removeListener: jest.fn().mockReturnThis(),
      perform: jest.fn(),
      unsubscribe: jest.fn(),
    }

    // Mock the subscription creation to return our mock subscription
    ;(mockActionCable.createConsumer('').subscriptions.create as jest.Mock).mockReturnValue(mockSubscription)

    // Create a mock cable instance
    mockCable = new Cable() as unknown as MockCableInstance
    mockChannel = mockSubscription // The channel is the same as subscription in this mock
    mockCable.setChannel.mockReturnValue(mockChannel)
    mockCable.channel.mockReturnValue(mockChannel)
  })

  it('should render with correct initial state', () => {
    const { getByText } = render(<ChatComponent chatId={1} userId={2} />)

    expect(getByText('Connection Status: Disconnected')).toBeTruthy()
    expect(getByText('Messages: 0')).toBeTruthy()
  })

  it('should create ActionCable consumer with correct URL', () => {
    render(<ChatComponent chatId={1} userId={2} />)

    expect(mockActionCable.createConsumer).toHaveBeenCalledWith('ws://localhost:3000/cable')
  })

  it('should create subscription with correct parameters', async () => {
    render(<ChatComponent chatId={1} userId={2} />)

    await waitFor(() => {
      expect(mockActionCable.createConsumer('').subscriptions.create).toHaveBeenCalledWith({
        channel: 'ChatChannel',
        chatId: 1,
        userId: 2,
      })
    })
  })

  it('should set up channel with correct name', async () => {
    render(<ChatComponent chatId={1} userId={2} />)

    await waitFor(() => {
      expect(mockCable.setChannel).toHaveBeenCalledWith('chat_1_2', mockSubscription)
    })
  })

  it('should register event listeners on channel', async () => {
    render(<ChatComponent chatId={1} userId={2} />)

    await waitFor(() => {
      expect(mockSubscription.on).toHaveBeenCalledWith('received', expect.any(Function))
      expect(mockSubscription.on).toHaveBeenCalledWith('connected', expect.any(Function))
      expect(mockSubscription.on).toHaveBeenCalledWith('disconnected', expect.any(Function))
    })
  })

  it('should handle connection events correctly', async () => {
    const { getByText } = render(<ChatComponent chatId={1} userId={2} />)

    // Simulate connection
    await waitFor(() => {
      const connectedCall = mockSubscription.on.mock.calls.find(
        (call: [string, () => void]) => call[0] === 'connected',
      )
      if (connectedCall) {
        connectedCall[1]()
      }
    })

    await waitFor(() => {
      expect(getByText('Connection Status: Connected')).toBeTruthy()
    })
  })

  it('should handle received messages correctly', async () => {
    const { getByText } = render(<ChatComponent chatId={1} userId={2} />)

    // Simulate receiving a message
    await waitFor(() => {
      const receivedCall = mockSubscription.on.mock.calls.find(
        (call: [string, (data: unknown) => void]) => call[0] === 'received',
      )
      if (receivedCall) {
        receivedCall[1]({
          type: 'new_message',
          message: { id: '1', text: 'Hello' },
        })
      }
    })

    await waitFor(() => {
      expect(getByText('Messages: 1')).toBeTruthy()
    })
  })

  it('should clean up channel on unmount', () => {
    const { unmount } = render(<ChatComponent chatId={1} userId={2} />)

    unmount()

    expect(mockSubscription.removeListener).toHaveBeenCalledWith('received', expect.any(Function))
    expect(mockSubscription.removeListener).toHaveBeenCalledWith('connected', expect.any(Function))
    expect(mockSubscription.removeListener).toHaveBeenCalledWith('disconnected', expect.any(Function))
    expect(mockSubscription.unsubscribe).toHaveBeenCalled()
  })
})

describe('ActionCable Mock Functionality', () => {
  it('should provide all expected ActionCable methods', () => {
    expect(ActionCable.createConsumer).toBeDefined()
    expect(ActionCable.startDebugging).toBeDefined()
    expect(ActionCable.stopDebugging).toBeDefined()
    expect(ActionCable.log).toBeDefined()
    expect(ActionCable.INTERNAL).toBeDefined()
  })

  it('should provide all expected Cable methods', () => {
    const cable = new Cable() as unknown as MockCableInstance
    expect(cable.channel).toBeDefined()
    expect(cable.setChannel).toBeDefined()
    expect(cable.channels).toBeDefined()
  })

  it('should allow testing consumer methods', () => {
    const consumer = ActionCable.createConsumer('ws://test')

    expect(consumer.subscriptions.create).toBeDefined()
    expect(consumer.connection.isActive).toBeDefined()
    expect(consumer.connection.isOpen).toBeDefined()
    expect(consumer.connect).toBeDefined()
    expect(consumer.disconnect).toBeDefined()
  })

  it('should allow testing subscription methods', () => {
    const consumer = ActionCable.createConsumer('ws://test')
    const subscription = consumer.subscriptions.create({ channel: 'TestChannel' })

    expect(subscription.on).toBeDefined()
    expect(subscription.removeListener).toBeDefined()
    expect(subscription.perform).toBeDefined()
    expect(subscription.unsubscribe).toBeDefined()
  })
})
