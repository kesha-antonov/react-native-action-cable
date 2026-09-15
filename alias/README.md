<p align="center">
  <a href="https://github.com/kesha-antonov/react-native-action-cable/actions/workflows/ci.yml"><img src="https://github.com/kesha-antonov/react-native-action-cable/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/react-native-action-cable"><img src="https://badge.fury.io/js/react-native-action-cable.svg" alt="npm version"></a>
  <a href="https://npm-stat.com/charts.html?package=%40kesha-antonov%2Freact-native-action-cable&from=2015-01-01"><img src="https://img.shields.io/badge/total%20downloads-580k-blue.svg" alt="total npm downloads"></a>
  <a href="https://github.com/kesha-antonov/react-native-action-cable/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
  <img src="https://img.shields.io/badge/platforms-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg" alt="platforms">
  <img src="https://img.shields.io/badge/TypeScript-supported-blue.svg" alt="TypeScript">
</p>

<!-- shared-header:start -->
<h1 align="center">React Native ActionCable</h1>

<p align="center">
  Use Rails ActionCable channels with React Native for real-time WebSocket communication.
</p>

<p align="center">
  <strong><a href="https://kesha-antonov.github.io/react-native-action-cable/">📖 Documentation</a></strong> &nbsp;·&nbsp;
  <a href="https://kesha-antonov.github.io/react-native-action-cable/installation">Installation</a> &nbsp;·&nbsp;
  <a href="https://kesha-antonov.github.io/react-native-action-cable/quick-start">Quick start</a> &nbsp;·&nbsp;
  <a href="https://kesha-antonov.github.io/react-native-action-cable/api">API reference</a> &nbsp;·&nbsp;
  <a href="https://kesha-antonov.github.io/react-native-action-cable/advanced">Advanced usage</a>
</p>

<p align="center">
  <sub>Using it in production? A ⭐ helps other developers find the library. DRIFTED</sub>
</p>

<hr />

<table align="center">
<tr>
<td align="center" valign="top" width="190">
  <a href="https://cryptoc-app.web.app/"><img src="https://cryptoc-app.web.app/img/icon.png?v=3" width="76" height="76" alt="cryptoc app icon" /></a>
  <br /><br />
  <img src="https://cryptoc-app.web.app/img/qr-get.png?v=2" width="124" height="124" alt="QR code that installs cryptoc" />
  <br />
  <sub>Scan to install</sub>
  <br /><br />
  <a href="https://apps.apple.com/app/cryptoc/id1333169178"><img height="40" src="https://cryptoc-app.web.app/img/appstore.svg?v=2" alt="Download on the App Store" /></a>
  <br />
  <a href="https://play.google.com/store/apps/details?id=co.ssoul.CryptoC"><img height="59" src="https://cryptoc-app.web.app/img/googleplay.png?v=2" alt="Get it on Google Play" /></a>
</td>
<td valign="top">

### Support my work

**[cryptoc](https://cryptoc-app.web.app/)** - my crypto portfolio app. Your coins on the home screen, lock screen and watch face. iPhone, iPad, Mac, Apple Watch, Android, Android tablet and Wear OS.

- Portfolio with average buy price and 24h / 180-day / all-time P&L
- Widgets in three sizes, refreshed in the background - most days you never open the app
- Price alerts on 5,000+ coins, delivered while the app is closed
- **No account, no email, no exchange API keys, no ads.** Your holdings never reach a server - they sync through your own iCloud or Google Drive
- Free for 3 holdings, and that is not a trial timer

<sub>Downloading it is what pays for the time that goes into these libraries.</sub>

</td>
</tr>
</table>

<hr />
<!-- shared-header:end -->

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
