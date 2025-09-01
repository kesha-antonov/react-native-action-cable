# React Native Frontend

This is the React Native frontend application for the ActionCable chat app.

## Features

- Real-time messaging using `@kesha-antonov/react-native-action-cable`
- Clean and simple chat interface
- Connection status indicator
- Username support
- Cross-platform (iOS/Android)

## Setup

### Prerequisites

- Node.js (v14 or higher)
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend URL

Make sure the Rails backend is running on `http://localhost:3000`. 

If you need to change the backend URL, edit `src/services/ChatService.js`:

```javascript
// Change this line to your Rails server URL
const WEBSOCKET_URL = 'ws://YOUR_BACKEND_URL/cable';
```

### 3. Run the App

#### For iOS:
```bash
npm run ios
```

#### For Android:
```bash
npm run android
```

#### Start Metro bundler separately:
```bash
npm start
```

## Project Structure

```
react-native-frontend/
├── App.js                    # Main app component
├── src/
│   ├── components/
│   │   ├── ChatScreen.js     # Main chat screen
│   │   ├── MessageList.js    # Message list component
│   │   ├── MessageInput.js   # Message input component
│   │   └── ConnectionStatus.js # Connection indicator
│   └── services/
│       └── ChatService.js    # ActionCable service
└── package.json
```

## Usage

1. Start the Rails backend server
2. Run the React Native app
3. Type a message and press send
4. Open another instance to test real-time messaging

## Key Components

### ChatService

Manages the ActionCable connection and provides methods for:
- Connecting/disconnecting from ActionCable
- Sending messages
- Subscribing to message events

### ChatScreen  

The main chat interface that:
- Displays messages in real-time
- Shows connection status
- Handles user input
- Manages username

## Development Notes

- Messages are not persisted in this example
- Username is set locally (no authentication)
- Single chat room ('general') is used
- Connection automatically established on app start

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx react-native start --reset-cache`
2. **Connection issues**: Make sure Rails server is running and accessible
3. **Build issues**: Clean and rebuild with `npx react-native run-android --reset-cache`

### Debug ActionCable

Add debugging to see ActionCable connection details:

```javascript
import { ActionCable } from '@kesha-antonov/react-native-action-cable';

// Enable debugging
ActionCable.startDebugging();
```