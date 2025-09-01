import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ConnectionStatus = ({ isConnected, statusMessage }) => {
  return (
    <View style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <Text style={styles.text}>
        {isConnected ? '● Connected' : '○ Disconnected'}
        {statusMessage ? ` - ${statusMessage}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  connected: {
    backgroundColor: '#d4edda',
  },
  disconnected: {
    backgroundColor: '#f8d7da',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ConnectionStatus;