import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ViewStyle, TextStyle } from 'react-native'

interface MessageInputProps {
  onSendMessage: (message: string) => void
  isConnected: boolean
}

interface Styles {
  container: ViewStyle
  textInput: TextStyle
  sendButton: ViewStyle
  sendButtonDisabled: ViewStyle
  sendButtonText: TextStyle
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isConnected }) => {
  const [message, setMessage] = useState('')

  const handleSend = (): void => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please wait for the connection to be established.')
      return
    }

    if (message.trim().length === 0) {
      Alert.alert('Empty Message', 'Please enter a message.')
      return
    }

    onSendMessage(message.trim())
    setMessage('')
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        placeholder="Type your message..."
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={500}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        style={[styles.sendButton, !isConnected && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!isConnected}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create<Styles>({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
})

export default MessageInput
