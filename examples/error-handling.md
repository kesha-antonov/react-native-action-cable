# ActionCable Error Event Handling Example

This example demonstrates how to use the new error event handling feature.

## Usage Example

```javascript
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable';

// Create consumer
const actionCable = ActionCable.createConsumer('wss://example.com/cable');
const cable = new Cable({});

// Create channel
const channel = cable.setChannel(
  'chat_1_2',
  actionCable.subscriptions.create({
    channel: 'ChatChannel',
    chatId: 1,
    userId: 2
  })
);

// Set up event listeners including the new error event
channel
  .on('received', (data) => {
    console.log('Message received:', data);
  })
  .on('connected', () => {
    console.log('WebSocket connected');
  })
  .on('disconnected', () => {
    console.log('WebSocket disconnected');
  })
  .on('error', (error) => {
    console.log('WebSocket connection error:', error);
    // You can handle errors here:
    // - Show offline message to user
    // - Implement retry logic
    // - Log error to analytics
    // - Update UI state
  });

// Connect
actionCable.connect();
```

## Error Scenarios

The `error` event will be triggered in situations such as:

1. **Network Issues**: No internet connection
2. **Invalid URL**: Wrong host or port
3. **Server Unavailable**: Server is down or unreachable
4. **Authentication Errors**: Invalid credentials or expired tokens
5. **Protocol Issues**: WebSocket handshake failures

## Example with Error Handling

```javascript
function ChatComponent({ chatId, userId }) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    setError(null);
  }, []);

  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleError = useCallback((errorEvent) => {
    console.error('WebSocket error:', errorEvent);
    setIsConnected(false);
    setError('Connection failed. Please check your internet connection.');
  }, []);

  const createChannel = useCallback(() => {
    const channel = cable.setChannel(
      `chat_${chatId}_${userId}`,
      actionCable.subscriptions.create({
        channel: 'ChatChannel',
        chatId,
        userId
      })
    );

    channel
      .on('connected', handleConnected)
      .on('disconnected', handleDisconnected)
      .on('error', handleError);

    return channel;
  }, [chatId, userId]);

  // ... rest of component
}
```

## Benefits

- **Better User Experience**: Users get immediate feedback about connection issues
- **Debugging**: Easier to diagnose connection problems in development
- **Resilience**: Applications can implement retry logic or fallback mechanisms
- **Monitoring**: Error events can be logged for analytics and monitoring