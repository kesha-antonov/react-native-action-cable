# Rails Backend for Chat App

This is a minimal Rails API backend that provides ActionCable WebSocket functionality for the React Native chat app.

## Features

- ActionCable for real-time messaging
- REST API endpoints for message history
- CORS configuration for React Native
- Simple message model

## Setup

### 1. Install Dependencies

```bash
bundle install
```

### 2. Setup Database

```bash
rails db:create
rails db:migrate
```

### 3. Start the Server

```bash
rails server
```

The server will start on `http://localhost:3000` with ActionCable available at `ws://localhost:3000/cable`.

## API Endpoints

### Messages

- `GET /messages` - Get message history
- `POST /messages` - Send a new message

### WebSocket

- `ws://localhost:3000/cable` - ActionCable endpoint

## ActionCable Channels

### ChatChannel

The main channel for handling real-time chat messages.

**Subscription parameters:**
- `room` - The chat room identifier (default: 'general')

**Actions:**
- `send_message` - Send a message to the room
  - Parameters: `message` (string), `username` (string)

## Configuration

### CORS

The app is configured to allow cross-origin requests from React Native. See `config/initializers/cors.rb`.

### ActionCable

ActionCable is configured to use Redis in production and async adapter in development. See `config/cable.yml`.

## Development Notes

- The app uses SQLite for simplicity in development
- Messages are not persisted by default (only real-time broadcasting)
- For production use, consider adding authentication and message persistence

## Testing the API

### Send a message via REST API

```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World!", "username": "test_user"}'
```

### Get messages

```bash
curl http://localhost:3000/messages
```