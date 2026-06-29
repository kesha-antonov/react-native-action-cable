<p align="center">
  <a href="https://badge.fury.io/js/@kesha-antonov%2Freact-native-action-cable"><img src="https://badge.fury.io/js/@kesha-antonov%2Freact-native-action-cable.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@kesha-antonov/react-native-action-cable"><img src="https://img.shields.io/npm/dm/@kesha-antonov/react-native-action-cable.svg" alt="npm downloads"></a>
  <a href="https://npm-stat.com/charts.html?package=%40kesha-antonov%2Freact-native-action-cable&from=2015-01-01"><img src="https://img.shields.io/badge/total%20downloads-580k-blue.svg" alt="total npm downloads"></a>
  <a href="https://github.com/kesha-antonov/react-native-action-cable/blob/master/LICENSE.txt"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg" alt="platforms">
  <img src="https://img.shields.io/badge/TypeScript-supported-blue.svg" alt="TypeScript">
</p>

<h1 align="center">React Native ActionCable</h1>

<p align="center">
  Use Rails ActionCable channels with React Native for real-time WebSocket communication.
</p>

---

## ✨ Features

- 🔌 **WebSocket Connection** - Automatic connection management with reconnection support
- 📡 **Channel Subscriptions** - Subscribe to multiple ActionCable channels
- 🔄 **Auto-Reconnect** - Automatically reconnects when connection is lost
- 🔐 **Custom Headers** - Support for authentication and dynamic headers
- 📱 **React Native Ready** - Works without `window` object polyfills
- 🛡️ **Connection Reuse** - Prevent duplicate connections during hot reloads
- ⚡ **TypeScript** - Full TypeScript support included

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [📖 Table of Contents](#-table-of-contents)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
  - [1. Create a consumer](#1-create-a-consumer)
  - [2. Subscribe to a channel](#2-subscribe-to-a-channel)
  - [3. Send messages](#3-send-messages)
  - [4. Cleanup](#4-cleanup)
- [📚 API Reference](#-api-reference)
  - [ActionCable](#actioncable)
  - [Consumer Instance](#consumer-instance)
  - [Cable](#cable)
  - [Channel](#channel)
- [⚙️ Advanced Usage](#️-advanced-usage)
- [🧪 Testing](#-testing)
  - [Jest Mock](#jest-mock)
- [📂 Examples](#-examples)
- [🤝 Contributing](#-contributing)
- [👏 Credits](#-credits)
- [📄 License](#-license)

---

## 📦 Installation

**Yarn**

```bash
yarn add @kesha-antonov/react-native-action-cable
```

**npm**

```bash
npm install @kesha-antonov/react-native-action-cable
```

---

## 🚀 Quick Start

### 1. Create a consumer

```typescript
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'

const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')
const cable = new Cable({})
```

### 2. Subscribe to a channel

```typescript
const channel = cable.setChannel(
  'ChatChannel',
  actionCable.subscriptions.create({
    channel: 'ChatChannel',
    roomId: 1
  })
)

channel
  .on('received', (data) => console.log('Received:', data))
  .on('connected', () => console.log('Connected!'))
  .on('disconnected', () => console.log('Disconnected'))
```

### 3. Send messages

```typescript
channel.perform('send_message', { text: 'Hello!' })
```

### 4. Cleanup

```typescript
channel.unsubscribe()
```

---

## 📚 API Reference

### ActionCable

| Method | Description |
|--------|-------------|
| `createConsumer(url, headers?)` | Create a new consumer and connect |
| `getOrCreateConsumer(url, headers?)` | Reuse existing consumer or create new one |
| `disconnectConsumer(url)` | Disconnect and remove consumer from cache |
| `startDebugging()` | Enable debug logging |
| `stopDebugging()` | Disable debug logging |

### Consumer Instance

| Method | Description |
|--------|-------------|
| `subscriptions.create(params)` | Create a channel subscription |
| `connection.isOpen()` | Check if connected |
| `connection.isActive()` | Check if connected or connecting |
| `disconnect()` | Disconnect from server |

### Cable

| Method | Description |
|--------|-------------|
| `setChannel(name, subscription)` | Register a channel |
| `channel(name)` | Get channel by name |

### Channel

| Method | Description |
|--------|-------------|
| `on(event, callback)` | Subscribe to events: `received`, `connected`, `disconnected`, `rejected`, `error` |
| `removeListener(event, callback)` | Remove event listener |
| `perform(action, data)` | Send message to server |
| `unsubscribe()` | Unsubscribe from channel |

---

## ⚙️ Advanced Usage

<details>
<summary><strong>Custom Headers & Authentication</strong></summary>

```typescript
// Static headers
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable', {
  'Authorization': 'Bearer token123'
})

// Dynamic headers (re-evaluated on each connection)
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable', () => ({
  'Authorization': `Bearer ${getAuthToken()}`
}))
```

</details>

<details>
<summary><strong>Preventing Duplicate Connections</strong></summary>

Use `getOrCreateConsumer` to prevent duplicate connections during hot reloads:

```typescript
// ❌ Creates new connection every time
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')

// ✅ Reuses existing connection
const actionCable = ActionCable.getOrCreateConsumer('ws://localhost:3000/cable')
```

</details>

<details>
<summary><strong>Error Handling</strong></summary>

```typescript
channel.on('error', (error) => {
  console.log('Connection error:', error)
  // Handle: no internet, wrong URL, server down, auth failure
})
```

</details>

<details>
<summary><strong>React Hook Example</strong></summary>

```typescript
function useActionCable(channelName: string, params: Record<string, unknown>) {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const channel = cable.setChannel(
      channelName,
      actionCable.subscriptions.create({ channel: channelName, ...params })
    )

    channel
      .on('connected', () => setConnected(true))
      .on('disconnected', () => setConnected(false))
      .on('received', handleReceived)

    return () => {
      channel.removeListener('received', handleReceived)
      channel.unsubscribe()
      delete cable.channels[channelName]
    }
  }, [channelName])

  return { connected, channel: cable.channel(channelName) }
}
```

</details>

<details>
<summary><strong>Custom Action Events</strong></summary>

Messages with `data.action` attribute are emitted as separate events:

```ruby
# Rails sends:
{ action: 'speak', text: 'hello!' }
```

```typescript
// React Native receives:
channel.on('speak', (data) => {
  console.log(data.text) // 'hello!'
})
```

</details>

---

## 🧪 Testing

### Jest Mock

```typescript
jest.mock('@kesha-antonov/react-native-action-cable', () => ({
  ActionCable: {
    createConsumer: jest.fn(() => ({
      subscriptions: {
        create: jest.fn(() => ({
          on: jest.fn().mockReturnThis(),
          removeListener: jest.fn().mockReturnThis(),
          perform: jest.fn(),
          unsubscribe: jest.fn(),
        })),
      },
      connection: {
        isActive: jest.fn(() => true),
        isOpen: jest.fn(() => true),
      },
      disconnect: jest.fn(),
    })),
  },
  Cable: jest.fn(() => ({
    channels: {},
    channel: jest.fn(),
    setChannel: jest.fn(),
  })),
}))
```

See [examples/testing](examples/testing) for complete testing examples.

---

## 📂 Examples

| Example | Description |
|---------|-------------|
| [Complete Chat App](examples/complete-chat-app) | Full Rails backend + React Native frontend |
| [Apollo GraphQL](examples/apollo-graphql) | ActionCable with GraphQL subscriptions |
| [Testing](examples/testing) | Jest mocks and testing patterns |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👏 Credits

Based on [action-cable-react](https://github.com/schneidmaster/action-cable-react). Code in `lib/action_cable` is adapted from Rails ActionCable.

> Please note that this project is maintained in free time. If you find it helpful, please consider [becoming a sponsor](https://github.com/sponsors/kesha-antonov).

---

## 📄 License

[MIT](./LICENSE)
