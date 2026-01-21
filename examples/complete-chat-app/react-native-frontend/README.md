# React Native Frontend (Expo)

This is the React Native frontend application for the ActionCable chat app, built with Expo.

## Features

- Real-time messaging using `@kesha-antonov/react-native-action-cable`
- Clean and simple chat interface
- Connection status indicator
- Username support
- Cross-platform (iOS/Android/Web)
- Built with Expo SDK 52

## Setup

### Prerequisites

- Node.js (v18 or higher)
- Yarn or npm
- Expo Go app (for testing on physical device)
- Xcode (for iOS development)
- Android Studio (for Android development)

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Backend URL

Make sure the Rails backend is running on `http://localhost:3000`.

If you need to change the backend URL, edit `src/services/ChatService.ts`:

```typescript
// Change this line to your Rails server URL
private WEBSOCKET_URL: string = 'ws://YOUR_BACKEND_URL/cable'
```

### 3. Run the App

#### Start Expo development server:
```bash
yarn start
```

#### For iOS:
```bash
yarn ios
```

#### For Android:
```bash
yarn android
```

#### For Web:
```bash
yarn web
```

## Project Structure

```
react-native-frontend/
├── app/
│   ├── _layout.tsx           # Root layout with navigation
│   └── index.tsx             # Home screen
├── src/
│   ├── components/
│   │   ├── ChatScreen.tsx    # Main chat screen
│   │   ├── MessageList.tsx   # Message list component
│   │   ├── MessageInput.tsx  # Message input component
│   │   └── ConnectionStatus.tsx # Connection indicator
│   ├── services/
│   │   └── ChatService.ts    # ActionCable service
│   └── types/
│       └── action-cable.d.ts # TypeScript declarations
├── app.json                  # Expo configuration
├── babel.config.js           # Babel configuration
├── tsconfig.json             # TypeScript configuration
└── package.json
```

## Usage

1. Start the Rails backend server
2. Run the Expo app
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

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **Connection issues**: Make sure Rails server is running and accessible
3. **Build issues**: Run `npx expo prebuild --clean`

### Debug ActionCable

Add debugging to see ActionCable connection details:

```typescript
import { ActionCable } from '@kesha-antonov/react-native-action-cable'

// Enable debugging
ActionCable.startDebugging()
```
