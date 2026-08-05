import React, { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { Chat, InputToolbar, type IMessage } from '@kesha-antonov/react-native-chat'

import ChatService from '../services/ChatService'
import ConnectionStatus from './ConnectionStatus'

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'http://localhost:3000'

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
  chat: ViewStyle
  toolbar: ViewStyle
  header: ViewStyle
  headerRow: ViewStyle
  title: TextStyle
  subtitle: TextStyle
  copyRow: ViewStyle
  copyText: TextStyle
  badge: ViewStyle
  badgeText: TextStyle
}

/** Turns a ChatChannel broadcast into a message the chat UI understands. */
function toChatMessage(data: MessageData): IMessage {
  const username = data.username ?? 'Anonymous'

  return {
    _id: data.id ?? `${username}-${data.timestamp ?? Date.now()}`,
    text: data.message ?? '',
    createdAt: data.timestamp != null ? new Date(data.timestamp) : new Date(),
    user: {
      _id: username,
      name: username,
    },
  }
}

const ChatScreen: React.FC = () => {
  const insets = useSafeAreaInsets()
  // The composer clears the home indicator while the keyboard is down. Tracking
  // the keyboard animation rather than a visible/hidden flag keeps the padding
  // shrinking in step with the keyboard, instead of dropping the composer to
  // the bottom edge for the length of the animation.
  const { progress } = useReanimatedKeyboardAnimation()
  const toolbarStyle = useAnimatedStyle(() => ({
    paddingBottom: insets.bottom * (1 - progress.value),
  }))
  const [messages, setMessages] = useState<IMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000))

  const handleNewMessage = useCallback((data: MessageData): void => {
    if (data.type !== 'new_message') return

    const confirmed = toChatMessage(data)
    setMessages(previous => {
      // The server echoes our own message back - drop the optimistic copy
      const withoutPending = previous.filter(
        message => !(message.pending && message.text === confirmed.text && message.user._id === confirmed.user._id),
      )

      return Chat.append(withoutPending, [confirmed])
    })
  }, [])

  const handleStatusChange = useCallback((connected: boolean, message: string): void => {
    setIsConnected(connected)
    setStatusMessage(message)
  }, [])

  useEffect(() => {
    ChatService.addMessageListener(handleNewMessage)
    ChatService.addStatusListener(handleStatusChange)
    ChatService.connect()

    return () => {
      ChatService.removeMessageListener(handleNewMessage)
      ChatService.removeStatusListener(handleStatusChange)
      ChatService.disconnect()
    }
  }, [handleNewMessage, handleStatusChange])

  // The server broadcasts every message back to all subscribers, including the
  // sender, so a delivered message is appended by the broadcast. A message sent
  // while the connection is down is queued by ChatService and shown as pending
  // until the broadcast confirms it.
  const handleSend = useCallback((outgoing: IMessage[] = []): void => {
    outgoing.forEach(message => {
      const isQueued = !ChatService.isConnected

      ChatService.sendMessage(message.text, username)

      if (isQueued) {
        setMessages(previous => Chat.append(previous, [{
          ...message,
          user: { _id: username, name: username },
          pending: true,
        }]))
      }
    })
  }, [username])

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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

      <View style={styles.chat}>
        <Chat
          messages={messages}
          onSend={handleSend}
          user={{ _id: username, name: username }}
          // Always editable: anything typed while offline is queued and sent
          // as soon as the connection is back
          textInputProps={{ placeholder: 'Type your message...' }}
          // Short conversations start under the header and re-anchor to the
          // bottom once the composer is focused
          isAlignedTop="auto"
          // The padding goes on a wrapper rather than InputToolbar's
          // containerStyle, which the toolbar also forwards to the send button
          renderInputToolbar={props => (
            <Animated.View style={[styles.toolbar, toolbarStyle]}>
              <InputToolbar {...props} />
            </Animated.View>
          )}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chat: {
    flex: 1,
  },
  toolbar: {
    backgroundColor: 'white',
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
