# Changelog

## v2.0.0

### ⚠️ Breaking Changes

- **TypeScript Rewrite:** Library is now written entirely in TypeScript
- **ES Modules:** Migrated from CommonJS `require()` to ES module imports

### ✨ New Features

- **SubscriptionGuarantor:** Added reliable subscription establishment with automatic retry logic synced from Rails ActionCable
- **Subprotocols Support:** Added `consumer.addSubProtocol()` to specify custom WebSocket subprotocols

### 📚 Documentation

- Added complete chat app example with Rails backend and Expo frontend
- Added Apollo GraphQL integration example
- Updated README with TypeScript examples

---

## v1.1.4

### 🐛 Bug Fixes

- **AppState Deprecation:** Fixed deprecated usage of `AppState` ([#14](https://github.com/kesha-antonov/react-native-action-cable/issues/14))

---

## v1.1.3

### 📦 Dependencies & Infrastructure

- Made build

---

## v1.1.2

### 🐛 Bug Fixes

- **Null Data Crash:** Fixed crash when received data is `null` ([#7](https://github.com/kesha-antonov/react-native-action-cable/issues/7))

---

## v1.1.1

### 📦 Dependencies & Infrastructure

- Updated dependencies

---

## v1.1.0

### 🐛 Bug Fixes

- **Firefox Protocol Error:** Fixed Firefox error `Unhandled Rejection (TypeError): setting getter-only property "protocol"` ([#11](https://github.com/kesha-antonov/react-native-action-cable/issues/11))
