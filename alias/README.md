<p align="center">
  <a href="https://github.com/kesha-antonov/react-native-action-cable/actions/workflows/ci.yml"><img src="https://github.com/kesha-antonov/react-native-action-cable/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/react-native-action-cable"><img src="https://badge.fury.io/js/react-native-action-cable.svg" alt="npm version"></a>
  <a href="https://npm-stat.com/charts.html?package=%40kesha-antonov%2Freact-native-action-cable&from=2015-01-01"><img src="https://img.shields.io/badge/total%20downloads-580k-blue.svg" alt="total npm downloads"></a>
  <a href="https://github.com/kesha-antonov/react-native-action-cable/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg" alt="platforms">
  <img src="https://img.shields.io/badge/TypeScript-supported-blue.svg" alt="TypeScript">
</p>

<h1 align="center">React Native ActionCable</h1>

<p align="center">
  Use Rails ActionCable channels with React Native for real-time WebSocket communication.
</p>

---

> **Note**
> This package is an alias for
> [`@kesha-antonov/react-native-action-cable`](https://www.npmjs.com/package/@kesha-antonov/react-native-action-cable)
> and re-exports it in full. Both names give you the same library, the same
> version, and the same API - install whichever you prefer.

---

## ✨ Features

- 🔌 **WebSocket Connection** - Automatic connection management with reconnection support
- 📡 **Channel Subscriptions** - Subscribe to multiple ActionCable channels
- 🔄 **Auto-Reconnect** - Automatically reconnects when connection is lost
- 🔐 **Custom Headers** - Support for authentication and dynamic headers
- 📱 **React Native Ready** - Works without `window` object polyfills, on the New Architecture (pure JS, no native module)
- 🛡️ **Connection Reuse** - Prevent duplicate connections during hot reloads
- ⚡ **TypeScript** - Full TypeScript support included

---

## 📦 Installation

**Yarn**

```bash
yarn add react-native-action-cable
```

**npm**

```bash
npm install react-native-action-cable
```

No native module, no pod install, no config plugin - it is pure JavaScript and
runs in Expo Go as well as bare React Native.

---

## 🚀 Quick Start

```typescript
import { ActionCable, Cable } from 'react-native-action-cable'

const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')
const cable = new Cable({})

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

channel.perform('send_message', { text: 'Hello!' })

// later
channel.unsubscribe()
```

---

## 📚 Documentation

Full API reference, advanced usage, testing patterns, and runnable examples live
in the main repository:

**[github.com/kesha-antonov/react-native-action-cable](https://github.com/kesha-antonov/react-native-action-cable#readme)**

| | |
|---|---|
| [API Reference](https://github.com/kesha-antonov/react-native-action-cable#-api-reference) | `ActionCable`, `Consumer`, `Cable`, `Channel` |
| [Custom Headers & Auth](https://github.com/kesha-antonov/react-native-action-cable#%EF%B8%8F-advanced-usage) | Static and dynamic auth headers |
| [Rails style channel mixins](https://github.com/kesha-antonov/react-native-action-cable#%EF%B8%8F-advanced-usage) | Port existing Rails channel code as-is |
| [Testing](https://github.com/kesha-antonov/react-native-action-cable#-testing) | Jest mocks and patterns |
| [Examples](https://github.com/kesha-antonov/react-native-action-cable/tree/master/examples) | Chat app, Apollo GraphQL, testing |

---

## 🤝 Contributing

Issues and pull requests belong in the
[main repository](https://github.com/kesha-antonov/react-native-action-cable).

---

## 👏 Credits

Based on [action-cable-react](https://github.com/schneidmaster/action-cable-react).
Code in `lib/action_cable` is adapted from [Rails ActionCable](https://github.com/rails/rails/tree/main/actioncable/app/javascript/action_cable).

> Please note that this project is maintained in free time. If you find it helpful, please consider [becoming a sponsor](https://github.com/sponsors/kesha-antonov).

---

## 📄 License

[MIT](https://github.com/kesha-antonov/react-native-action-cable/blob/master/LICENSE)
