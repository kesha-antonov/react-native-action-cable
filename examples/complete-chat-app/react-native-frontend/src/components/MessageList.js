import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet,
} from 'react-native';

const MessageList = ({ messages }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message, index) => {
    if (message.type === 'new_message') {
      return (
        <View key={message.id || index} style={styles.messageContainer}>
          <View style={styles.messageHeader}>
            <Text style={styles.username}>{message.username}</Text>
            <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
          </View>
          <Text style={styles.messageText}>{message.message}</Text>
        </View>
      );
    } else if (message.type === 'user_joined' || message.type === 'user_left') {
      return (
        <View key={index} style={styles.systemMessageContainer}>
          <Text style={styles.systemMessage}>
            {message.message} at {formatTime(message.timestamp)}
          </Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
        </View>
      ) : (
        messages.map((message, index) => renderMessage(message, index))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontWeight: 'bold',
    color: '#007AFF',
    fontSize: 14,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: '#333',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default MessageList;