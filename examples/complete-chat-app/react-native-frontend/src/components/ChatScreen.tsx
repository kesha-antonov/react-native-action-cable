import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, ViewStyle, TextStyle, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'

import ChatService from '../services/ChatService'
import ConnectionStatus from './ConnectionStatus'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

const WEB_APP_URL = 'http://localhost:3000'

interface MessageData {
  type: string
  id?: string
  message?: string
  username?: string
  timestamp?: string
  [key: string]: unknown
}

interface Styles {
  container: ViewStyle
  header: ViewStyle
  headerRow: ViewStyle
  title: TextStyle
  subtitle: TextStyle
  copyRow: ViewStyle
  copyText: TextStyle
  badge: ViewStyle
  badgeText: TextStyle
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000))

  useEffect(() => {
    // Initialize chat service
    initializeChatService()

    // Cleanup on unmount
    return () => {
      ChatService.disconnect()
    }
  }, [])

  const initializeChatService = (): void => {
    // Add listeners
    ChatService.addMessageListener(handleNewMessage)
    ChatService.addStatusListener(handleStatusChange)

    // Connect to ActionCable
    ChatService.connect()
  }

  const handleNewMessage = (data: MessageData): void => {
    console.log('New message received:', data)
    setMessages(prevMessages => [...prevMessages, data])
  }

  const handleStatusChange = (connected: boolean, message: string): void => {
    console.log('Status changed:', connected, message)
    setIsConnected(connected)
    setStatusMessage(message)
  }

  const handleSendMessage = (message: string): void => {
    ChatService.sendMessage(message, username)
  }

  const handleUsernameChange = (): void => {
    Alert.prompt(
      'Change Username',
      'Enter your new username:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: (newUsername?: string) => {
            if (newUsername && newUsername.trim().length > 0) {
              setUsername(newUsername.trim())
            }
          },
        },
      ],
      'plain-text',
      username,
    )
  }

  const openWebApp = (): void => {
    Clipboard.setStringAsync(WEB_APP_URL)
    Alert.alert('Copied!', WEB_APP_URL)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>ActionCable Chat</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Mobile</Text>
          </View>
        </View>
        <Text style={styles.subtitle} onPress={handleUsernameChange}>
          {username} (tap to change)
        </Text>
        <TouchableOpacity style={styles.copyRow} onPress={openWebApp}>
          <Text style={styles.copyText}>{WEB_APP_URL}</Text>
          <Ionicons name="copy-outline" size={14} color="#666" />
        </TouchableOpacity>
      </View>

      <ConnectionStatus isConnected={isConnected} statusMessage={statusMessage} />

      <MessageList messages={messages} />

      <MessageInput onSendMessage={handleSendMessage} isConnected={isConnected} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  copyText: {
    fontSize: 13,
    color: '#666',
  },
  badge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
})

export default ChatScreen
