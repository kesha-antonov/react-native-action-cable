# Complete Chat App Example

This example demonstrates a complete working chat application using `@kesha-antonov/react-native-action-cable` with both Rails backend and React Native frontend.

## Overview

This is a simple real-time chat application that includes:

- **Rails Backend**: A complete Rails API with ActionCable for real-time messaging
- **React Native Frontend**: A complete React Native app using this library for real-time communication

## Features

- Real-time messaging between users
- User presence indicators
- Connection status display
- Simple and clean UI
- Complete setup instructions for both backend and frontend

## Project Structure

```
complete-chat-app/
├── README.md                  # This file
├── rails-backend/            # Rails API backend
│   ├── Gemfile
│   ├── app/
│   │   ├── channels/
│   │   │   ├── application_cable/
│   │   │   └── chat_channel.rb
│   │   ├── controllers/
│   │   │   └── messages_controller.rb
│   │   └── models/
│   │       └── message.rb
│   └── config/
│       ├── routes.rb
│       └── environments/
└── react-native-frontend/    # React Native app
    ├── package.json
    ├── App.js
    ├── src/
    │   ├── components/
    │   │   ├── ChatScreen.js
    │   │   ├── MessageList.js
    │   │   └── MessageInput.js
    │   └── services/
    │       └── ChatService.js
    └── README.md
```

## Quick Start

### 1. Start the Rails Backend

```bash
cd rails-backend
bundle install
rails server
```

The Rails server will start on `http://localhost:3000`

### 2. Start the React Native Frontend

```bash
cd react-native-frontend
npm install
# For iOS
npx react-native run-ios
# For Android  
npx react-native run-android
```

### 3. Test the Chat

- Open the React Native app
- Type a message and press send
- Open another instance (simulator/device) to see real-time messaging

## Detailed Setup Instructions

See the individual README files in each directory:

- [Rails Backend Setup](rails-backend/README.md)
- [React Native Frontend Setup](react-native-frontend/README.md)

## How it Works

### ActionCable Integration

1. **Rails Side**: The `ChatChannel` handles WebSocket connections and broadcasts messages to subscribed clients
2. **React Native Side**: The app uses `@kesha-antonov/react-native-action-cable` to connect to the Rails ActionCable server
3. **Real-time Communication**: Messages are sent through ActionCable and immediately broadcast to all connected clients

### Key Components

- **ChatChannel**: Rails ActionCable channel for handling chat messages
- **ChatService**: React Native service for managing ActionCable connection
- **ChatScreen**: Main React Native component for the chat interface

## Customization

This example can be extended with:

- User authentication
- Multiple chat rooms
- Message history/persistence
- File sharing
- Push notifications
- Typing indicators

## Troubleshooting

### Common Issues

1. **Connection Failed**: Make sure Rails server is running on `http://localhost:3000`
2. **Messages Not Appearing**: Check that both ActionCable and the React Native app are properly connected
3. **Build Errors**: Ensure all dependencies are installed with `bundle install` and `npm install`

### Debug Mode

Enable ActionCable debugging in the React Native app:

```javascript
import { ActionCable } from '@kesha-antonov/react-native-action-cable';

// Enable debugging
ActionCable.startDebugging();
```

## Credits

This example demonstrates the core functionality of `@kesha-antonov/react-native-action-cable` in a real-world scenario.