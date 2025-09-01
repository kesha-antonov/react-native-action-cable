import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';

import ChatService from '../services/ChatService';
import ConnectionStatus from './ConnectionStatus';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [username, setUsername] = useState('User' + Math.floor(Math.random() * 1000));

  useEffect(() => {
    // Initialize chat service
    initializeChatService();

    // Cleanup on unmount
    return () => {
      ChatService.disconnect();
    };
  }, []);

  const initializeChatService = () => {
    // Add listeners
    ChatService.addMessageListener(handleNewMessage);
    ChatService.addStatusListener(handleStatusChange);

    // Connect to ActionCable
    ChatService.connect();
  };

  const handleNewMessage = (data) => {
    console.log('New message received:', data);
    setMessages(prevMessages => [...prevMessages, data]);
  };

  const handleStatusChange = (connected, message) => {
    console.log('Status changed:', connected, message);
    setIsConnected(connected);
    setStatusMessage(message);
  };

  const handleSendMessage = (message) => {
    ChatService.sendMessage(message, username);
  };

  const handleUsernameChange = () => {
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
          onPress: (newUsername) => {
            if (newUsername && newUsername.trim().length > 0) {
              setUsername(newUsername.trim());
            }
          },
        },
      ],
      'plain-text',
      username
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ActionCable Chat</Text>
        <Text style={styles.subtitle} onPress={handleUsernameChange}>
          {username} (tap to change)
        </Text>
      </View>

      <ConnectionStatus 
        isConnected={isConnected} 
        statusMessage={statusMessage} 
      />

      <MessageList messages={messages} />

      <MessageInput 
        onSendMessage={handleSendMessage}
        isConnected={isConnected}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
});

export default ChatScreen;