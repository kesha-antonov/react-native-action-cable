[![npm version](https://badge.fury.io/js/action-cable-react.svg)](https://badge.fury.io/js/action-cable-react)
[![Bower version](https://badge.fury.io/bo/action-cable-react.svg)](https://badge.fury.io/bo/action-cable-react)

# ActionCable + React Native

Use Rails 5+ ActionCable channels with React Native for realtime magic.

This is a fork from https://github.com/schneidmaster/action-cable-react

## Overview

The `react-native-action-cable` package exposes two modules: ActionCable, Cable.

- **`ActionCable`**: holds info and logic of connection and automatically tries to reconnect when connection is lost.
- **`Cable`**: holds references to channels(subscriptions) created by action cable.

## Install

```yarn add @kesha-antonov/react-native-action-cable```

## React Native Compatibility

This library is fully compatible with React Native environments. It automatically detects the available WebSocket implementation and works without requiring `window` object polyfills.

## Usage

Import:

```javascript
import {
  ActionCable,
  Cable,
} from '@kesha-antonov/react-native-action-cable'
```

Define once ActionCable and Cable in your application setup in your store (like `Redux` or `MobX`).

Create your consumer:

```javascript
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')
```

You can also pass headers as a function for dynamic authentication:

```javascript
// Static headers
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable', {
  'Authorization': 'Bearer token123'
})

// Dynamic headers (function that returns headers object)
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable', () => ({
  'Authorization': `Bearer ${getCurrentAuthToken()}`
}))
```

Right after that create Cable instance. It'll hold info of our channels.

```javascript
const cable = new Cable({})
```

Then, you can subscribe to channel:

```javascript
const channel = cable.setChannel(
  `chat_${chatId}_${userId}`, // channel name to which we will pass data from Rails app with `stream_from`
  actionCable.subscriptions.create({
    channel: 'ChatChannel', // from Rails app app/channels/chat_channel.rb
    chatId,
    otherParams...
  })
)

channel
  .on( 'received', this.handleReceived )
  .on( 'connected', this.handleConnected )
  .on( 'rejected', this.handleDisconnected )
  .on( 'disconnected', this.handleDisconnected )
  .on( 'error', this.handleError )
```

...later we can remove event listeners and unsubscribe from channel:

```javascript
const channelName = `chat_${chatId}_${userId}`
const channel = cable.channel(channelName)
if (channel) {
  channel
    .removeListener( 'received', this.handleReceived )
    .removeListener( 'connected', this.handleConnected )
    .removeListener( 'rejected', this.handleDisconnected )
    .removeListener( 'disconnected', this.handleDisconnected )
    .removeListener( 'error', this.handleError )
  channel.unsubscribe()
  delete( cable.channels[channelName] )
}

```

You can combine React's lifecycle hook `useEffect` to subscribe and unsubscribe from channels. Or implement custom logic in your `store`.

Here's example how you can handle events:

```javascript
function Chat ({ chatId, userId }) {
  const [isWebsocketConnected, setIsWebsocketConnected] = useState(false)

  const onNewMessage = useCallback(message => {
    // ... ADD TO MESSAGES LIST
  }, [])

  const handleReceived = useCallback(({ type, message }) => {
    switch(type) {
      'new_incoming_message': {
         onNewMessage(message)
      }
      ...
    }
  }, [])

  const handleConnected = useCallback(() => {
    setIsWebsocketConnected(true)
  }, [])

  const handleDisconnected = useCallback(() => {
    setIsWebsocketConnected(false)
  }, [])

  const handleError = useCallback((error) => {
    console.log('WebSocket error:', error)
    setIsWebsocketConnected(false)
  }, [])

  const getChannelName = useCallback(() => {
    return `chat_${chatId}_${userId}`
  }, [chatId, userId])

  const createChannel = useCallback(() => {
    const channel = cable.setChannel(
      getChannelName(), // channel name to which we will pass data from Rails app with `stream_from`
      actionCable.subscriptions.create({
        channel: 'ChatChannel', // from Rails app app/channels/chat_channel.rb
        chatId,
        otherParams...
      })
    )

    channel
      .on( 'received', handleReceived )
      .on( 'connected', handleConnected )
      .on( 'disconnected', handleDisconnected )
      .on( 'error', handleError )
  }, [])

  const removeChannel = useCallback(() => {
    const channelName = getChannelName()

    const channel = cable.channel(channelName)
    if (!channel)
      return

    channel
      .removeListener( 'received', handleReceived )
      .removeListener( 'connected', handleConnected )
      .removeListener( 'disconnected', handleDisconnected )
      .removeListener( 'error', handleError )
    channel.unsubscribe()
    delete( cable.channels[channelName] )
  }, [])

  useEffect(() => {
    createChannel()

    return () => {
      removeChannel()
    }
  }, [])

  return (
    <View>
      // ... RENDER CHAT HERE
    </View>
  )
}

```

Send message to Rails app:

```javascript
cable.channel(channelName).perform('send_message', { text: 'Hey' })

cable.channel('NotificationsChannel').perform('appear')
```

## Obtaining chatId and userId

You might wonder: "Where do `chatId` and `userId` come from?" These are values that your React Native app needs to obtain before creating the ActionCable subscription. Here are the most common approaches:

### 1. From Navigation/Route Parameters
```javascript
// Using React Navigation
function ChatScreen({ route }) {
  const { chatId, userId } = route.params;
  // Now use chatId and userId for your subscription
}
```

### 2. From API Calls
```javascript
function Chat() {
  const [chatId, setChatId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Fetch chat and user data from your API
    const fetchChatData = async () => {
      const response = await fetch('/api/current-chat');
      const data = await response.json();
      setChatId(data.chatId);
      setUserId(data.userId);
    };
    
    fetchChatData();
  }, []);

  // Only create subscription once we have the required data
  useEffect(() => {
    if (chatId && userId) {
      // Create your ActionCable subscription here
    }
  }, [chatId, userId]);
}
```

### 3. From Authentication Context
```javascript
function Chat({ chatId }) {
  const { currentUser } = useAuth(); // From your auth provider
  const userId = currentUser?.id;

  // Use chatId (from props/navigation) and userId (from auth context)
}
```

### 4. From Global State (Redux/Context)
```javascript
function Chat() {
  const chatId = useSelector(state => state.chat.currentChatId);
  const userId = useSelector(state => state.auth.userId);

  // Use values from your global state
}
```

The key point is that you need to obtain these identifiers through your app's normal data flow (API calls, navigation, authentication, etc.) before creating the ActionCable subscription.

## Methods

`ActionCable` top level methods:

- **`.createConsumer(websocketUrl, headers = {})`**  - create actionCable consumer and start connecting.
  - `websocketUrl` - url to your Rails app's `cable` endpoint (can be a string or a function that returns a string)
  - `headers` - headers to send with connection request (can be an object or a function that returns an object)
- **`.getOrCreateConsumer(websocketUrl, headers = {})`**  - get existing consumer or create a new one. Prevents multiple connections to the same URL.
  - Returns existing active consumer if available, otherwise creates a new one
  - Automatically cleans up disconnected consumers
  - Useful for preventing duplicate connections during app restarts or hot reloads
- **`.disconnectConsumer(websocketUrl, headers = {})`**  - disconnect and remove a specific consumer from cache.
  - Returns `true` if consumer was found and disconnected, `false` otherwise
- **`.startDebugging()`**  - start logging
- **`.stopDebugging()`**  - stop logging

`ActionCable` instance methods:

- **`.open()`**  - try connect
- **`.connection.isOpen()`**  - check if `connected`
- **`.connection.isActive()`**  - check if `connected` or `connecting`
- **`.subscriptions.create({ channel, otherParams... })`**  - create subscription to Rails app
- **`.disconnect()`**  - disconnects from Rails app


`Cable` instance methods:

- **`.setChannel(name, actionCable.subscriptions.create())`**  - set channel to get it later
- **`.channel(name)`**  - get channel by name

`channel` methods:

- **`.perform(action, data)`**  - send message to channel. action - `string`, data - `json`
- **`.removeListener(eventName, eventListener)`**  - unsubscribe from event
- **`.unsubscribe()`**  - unsubscribe from channel
- **`.on(eventName, eventListener)`**  - subscribe to events. eventName can be `received`, `connected`, `rejected`, `disconnected`, `error` or value of `data.action` attribute from channel message payload.

Custom action example:
```rb
{
  "identifier": "{\"channel\":\"ChatChannel\",\"id\":42}",
  "command": "message",
  "data": "{\"action\":\"speak\",\"text\":\"hello!\"}"
}
```
Above message will be emited with `eventName = 'speak'`

## Preventing Multiple Connections

When developing React Native apps, you may encounter duplicate ActionCable connections during:
- Hot reloads/Fast Refresh
- App restarts
- Component remounting

This can cause multiple event listeners and duplicate message handling. To prevent this:

### Use `getOrCreateConsumer` instead of `createConsumer`

```javascript
// ❌ This creates a new connection every time
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable');

// ✅ This reuses existing connections
const actionCable = ActionCable.getOrCreateConsumer('ws://localhost:3000/cable');
```

### Implement proper cleanup

```javascript
// In your component
class MyComponent extends Component {
  componentDidMount() {
    this.setupActionCable();
  }
  
  componentWillUnmount() {
    this.cleanupActionCable();
  }
  
  setupActionCable() {
    // This will reuse existing connection if available
    this.consumer = ActionCable.getOrCreateConsumer('ws://localhost:3000/cable');
    // ... setup channels
  }
  
  cleanupActionCable() {
    if (this.channel) {
      this.channel.removeListener('received', this.handleReceived);
      this.channel.unsubscribe();
    }
  }
}
```

### Check connection status

```javascript
// Check if consumer is active before creating subscriptions
if (actionCable.connection.isActive()) {
  console.log('Already connected');
} else {
  console.log('Not connected');
}
```

### Manual consumer cleanup

```javascript
// Disconnect and remove a specific consumer from cache
ActionCable.disconnectConsumer('ws://localhost:3000/cable');
```

## Connection Error Handling

The library now supports listening to WebSocket connection errors. This is useful for handling scenarios such as:

- No internet connection
- Wrong host/URL
- Server unavailable
- Authentication failures

```javascript
channel.on('error', (error) => {
  console.log('WebSocket connection error:', error);
  // Handle error (show offline message, retry logic, etc.)
});
```

The `error` event will be triggered when the underlying WebSocket connection encounters an error, allowing you to implement custom error handling logic in your application.

## Testing with Jest

This library can be easily mocked for Jest tests. Here are several approaches:

### Quick Setup

For most use cases, you can use this comprehensive mock:

```javascript
jest.mock('@kesha-antonov/react-native-action-cable', () => {
  const createMockSubscription = () => ({
    on: jest.fn().mockReturnThis(),
    removeListener: jest.fn().mockReturnThis(),
    perform: jest.fn(),
    unsubscribe: jest.fn(),
  });

  const createMockConsumer = () => ({
    subscriptions: {
      create: jest.fn().mockImplementation(() => createMockSubscription()),
    },
    connection: {
      isActive: jest.fn().mockReturnValue(true),
      isOpen: jest.fn().mockReturnValue(true),
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
  });

  return {
    ActionCable: {
      createConsumer: jest.fn().mockImplementation(() => createMockConsumer()),
      startDebugging: jest.fn(),
      stopDebugging: jest.fn(),
      log: jest.fn(),
    },
    Cable: jest.fn().mockImplementation(() => ({
      channels: {},
      channel: jest.fn(),
      setChannel: jest.fn(),
    })),
  };
});
```

### Testing Examples

```javascript
// Test component that uses ActionCable
it('should create consumer and subscription', () => {
  render(<YourComponent />);
  
  expect(ActionCable.createConsumer).toHaveBeenCalledWith('ws://localhost:3000/cable');
});

it('should handle received messages', () => {
  const { getByText } = render(<YourComponent />);
  
  // Get the mock subscription
  const mockSubscription = ActionCable.createConsumer().subscriptions.create();
  
  // Simulate receiving a message
  const receivedHandler = mockSubscription.on.mock.calls
    .find(call => call[0] === 'received')[1];
  receivedHandler({ type: 'new_message', message: 'Hello' });
  
  expect(getByText('Hello')).toBeTruthy();
});
```

### Complete Examples

For comprehensive examples including:
- Full Jest setup files
- Example components and tests  
- Common testing patterns
- Troubleshooting guide

Check the [`examples/testing`](examples/testing) directory in this repository.

## Complete Examples

### Basic Chat Application

For a complete working example with both Rails backend and React Native frontend:

**[Complete Chat App Example](examples/complete-chat-app)**

This example includes:
- **Complete Rails Backend**: Ready-to-run Rails API with ActionCable channel
- **Complete React Native Frontend**: Full app using this library for real-time chat
- **Step-by-step Setup**: Detailed instructions for both backend and frontend
- **Real-time Messaging**: Live demonstration of ActionCable integration

### Apollo GraphQL Integration

For using ActionCable with GraphQL subscriptions and Apollo Client:

**[Apollo GraphQL Example](examples/apollo-graphql)**

This example shows how to:
- Set up Apollo Client with ActionCable for GraphQL subscriptions
- Use the adapted ActionCableLink for seamless integration
- Handle real-time GraphQL subscriptions in React Native
- Configure Rails backend for GraphQL over ActionCable

## Contributing

1. Fork it ( https://github.com/kesha-antonov/react-native-action-cable/fork )
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create a new Pull Request

## Credits

Obviously, this project is heavily indebted to the entire Rails team, and most of the code in `lib/action_cable` is taken directly from Rails 5. This project also referenced [fluxxor](https://github.com/BinaryMuse/fluxxor) for implementation details and props binding.

## License

MIT
