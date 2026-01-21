/**
 * Example React component that uses ActionCable
 * This demonstrates how to use the library in a real component
 */

import React, { useState, useEffect, useCallback } from 'react'
import { View, Text } from 'react-native'
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'

interface Message {
  id: string
  text: string
  [key: string]: unknown
}

interface ReceivedData {
  type: string
  message?: Message
}

interface ChatComponentProps {
  chatId: number
  userId: number
}

// Initialize ActionCable (typically done once in your app)
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')
const cable = new Cable({})

export const ChatComponent: React.FC<ChatComponentProps> = ({ chatId, userId }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  const handleReceived = useCallback((data: unknown): void => {
    const typedData = data as ReceivedData
    if (typedData.type === 'new_message' && typedData.message) {
      setMessages(prev => [...prev, typedData.message!])
    }
  }, [])

  const handleConnected = useCallback((): void => {
    setIsConnected(true)
  }, [])

  const handleDisconnected = useCallback((): void => {
    setIsConnected(false)
  }, [])

  const getChannelName = useCallback((): string => {
    return `chat_${chatId}_${userId}`
  }, [chatId, userId])

  const createChannel = useCallback(() => {
    const channelName = getChannelName()
    const subscription = actionCable.subscriptions.create({
      channel: 'ChatChannel',
      chatId,
      userId,
    })

    const channel = cable.setChannel(channelName, subscription)

    channel
      .on('received', handleReceived)
      .on('connected', handleConnected)
      .on('disconnected', handleDisconnected)

    return channel
  }, [chatId, userId, handleReceived, handleConnected, handleDisconnected, getChannelName])

  const removeChannel = useCallback((): void => {
    const channelName = getChannelName()
    const channel = cable.channel(channelName)

    if (channel) {
      channel
        .removeListener('received', handleReceived)
        .removeListener('connected', handleConnected)
        .removeListener('disconnected', handleDisconnected)

      channel.unsubscribe()
      delete cable.channels[channelName]
    }
  }, [getChannelName, handleReceived, handleConnected, handleDisconnected])

  useEffect(() => {
    createChannel()

    return () => {
      removeChannel()
    }
  }, [createChannel, removeChannel])

  return (
    <View>
      <Text>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      <Text>Messages: {messages.length}</Text>
    </View>
  )
}
