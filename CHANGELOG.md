# Changelog

## v3.0.1 (2026-08-06)

No functional changes - `index.ts` and everything under `lib/` are untouched.
This release is packaging and repository metadata.

### 📦 Packaging

- **`types` declared:** `package.json` now points `types` at the entry point. Type resolution already worked through `main`, since TypeScript falls back to the `.ts` source it names, but npm and the React Native Directory decide whether a package is typed from the `types` field - and both were reporting this one as untyped
- **Author metadata fixed:** npm's `author` field takes a single person, so the previous comma-joined string was parsed down to its first entry and the current maintainer did not appear on the package page at all. The maintainer is now `author`, and the original author of [action-cable-react](https://github.com/schneidmaster/action-cable-react) moved to `contributors`, which is npm's field for this
- **Keywords:** added `expo`, `websockets`, `chat`, `new-architecture`, `ruby-on-rails` and `actioncable-client`
- Copyright extended through the present

### 🔐 Supply Chain

- Added a release workflow that publishes from GitHub Actions with `--provenance`, gated behind lint, typecheck and tests. Once an `NPM_TOKEN` secret is configured, published tarballs carry a signed, verifiable link back to the workflow run and commit that built them. This release predates that and was published manually, so it has no attestation

### 📖 Documentation

- Added `CONTRIBUTING.md` and `SECURITY.md`. Security reports now route to private GitHub advisories instead of public issues
- Fixed the license badge, which linked to a `LICENSE.txt` that does not exist

### 🧪 Tests

- **Flaky end-to-end reconnect test:** the integration suite left the connection monitor's poll jitter live, so `getPollInterval()` returned anywhere from 6 s to 12 s while the test advanced a fixed 24 s and asserted the socket had reopened. Roughly one run in four failed. The jitter is now pinned with the same `Math.random` stub `connection_monitor.test.ts` already used. Test-only - the jitter itself is correct and matches Rails, and no shipped code changed

---

## v3.0.0 (2026-08-05)

### ⚠️ Breaking Changes

- **Error payload:** `error` listeners used to receive the raw platform event. They now receive `{ message, event }` - a readable message with the original event still attached as `error.event`. On React Native the old payload was a bare `Event` carrying no detail, so there was nothing usable to read off it; anywhere you did, switch to `error.event`
- **SubscriptionGuarantor:** `startRetrying`/`stopRetrying` are now `startGuaranteeing`/`stopGuaranteeing`, matching Rails. This is an internal class - only relevant if you drove it directly

### 📦 Dependencies & Infrastructure

- **GitHub Actions CI:** lint, typecheck and tests run on every push to `master` and every pull request, with the test suite on Node 20, 22 and 24
- **Yarn 4:** upgraded from Yarn 3.4.1 to 4.18.0, pinned through `packageManager` so Corepack resolves it (run `corepack enable` once if `yarn` is not already managed by it)
- **Node:** `.nvmrc` now pins the version actually in use (v24.3.0) instead of the long stale v13.8.0; CI reads it
- ESLint no longer walks generated coverage output

### 📱 Examples

- Every example runs on Expo SDK 57 / React Native 0.86 - the New Architecture (Fabric + bridgeless), verified at runtime on a simulator. React Native 0.82 removed the legacy architecture, so there is no arch flag to set; the stale SDK 54 prebuilds that still carried `newArchEnabled` were dropped
- All examples updated to their latest dependencies: Apollo Client 4, Jest 30, React Native Testing Library 14, Rails 8.1.3.1 with puma 8 and redis 6
- The chat app is rebuilt on [`@kesha-antonov/react-native-chat`](https://github.com/kesha-antonov/react-native-chat) and queues messages typed while the connection is down, delivering them on reconnect
- The Apollo example is a runnable Expo app again (it pointed at an expo-router entry with no `app/` directory) and is migrated to Apollo Client 4
- The testing example had no Jest config at all; it now runs on `@react-native/jest-preset` and passes

### 🔄 Rails Parity

Synced `lib/action_cable` against Rails `main` (`actioncable/app/javascript/action_cable`):

- **Safari 15.1+ fix:** `connection.close()` no longer closes a socket that is still connecting, matching [rails/rails#45738](https://github.com/rails/rails/issues/45738)
- **Channel mixins:** `subscriptions.create(channel, mixin)` accepts a Rails style object of callbacks (`received`, `connected`, `disconnected`, custom actions), so Rails ActionCable code ports over as is. The `channel.on(...)` event emitter API is unchanged when no mixin is given
- **SubscriptionGuarantor:** retry scheduling now matches Rails - `startGuaranteeing`/`stopGuaranteeing` (previously `startRetrying`/`stopRetrying`), the timer restarts on every `guarantee()`, and retries stop when the subscribe command cannot be sent (a reconnect reloads subscriptions anyway) instead of polling every 500 ms while offline. The guarantor now logs like Rails does
- **Exports:** `Connection`, `ConnectionMonitor`, `Consumer`, `Subscription`, `Subscriptions`, `SubscriptionGuarantor`, `INTERNAL` and `createWebSocketURL` are exported from the package entry point, as Rails exports them, together with the public types
- `connection.open()` tolerates a consumer without `subprotocols`

Intentional differences from Rails are unchanged: React Native `AppState` instead of `document.visibilitychange`, an injectable `WebSocket` implementation and request headers, `error` events on subscriptions, React Native Blob release on incoming messages, and string based url resolution (Rails resolves relative urls through `document.createElement('a')`).

### 🧪 Tests

- Added a Jest test suite (`yarn test`) covering the connection, connection monitor, consumer, subscriptions, subscription guarantor and the public `ActionCable`/`Cable` API, plus end-to-end flows against an ActionCable server double. Every bug fixed below has a regression test

### 🐛 Bug Fixes

- **Connection state detection:** `getState()` resolved `readyState` against the *global* `WebSocket` constants only. With a custom WebSocket class (`ActionCable.WebSocket = ...`) or in environments without a global `WebSocket`, the connection was permanently reported as closed - `send()` always returned `false` and every subscription opened another socket
- **App foreground reconnect:** React Native's `AppState` was looked up via `globalThis.require`, which never resolves under Metro, so the monitor never reconnected when the app returned to the foreground
- **Consumer reuse:** `getOrCreateConsumer()` disconnected and replaced the cached consumer whenever it was not currently connected, silently killing the subscriptions the app was holding (regression on transient network drops and on two calls made before the first connection)
- **Null data crash:** `received(null)` crashed again after the TypeScript rewrite (regression of v1.1.2); string and array payloads crashed too
- **Callback payloads:** `connected` now receives `{ reconnected }` and `disconnected` receives `{ willAttemptReconnect, code, reason }` - the first two were computed but dropped before reaching the listener, and the close code/reason is where React Native reports *why* a socket dropped
- **Data mutation:** `perform()` and `received()` no longer mutate the object passed by the caller / broadcast by the server (throws on frozen objects, and leaks `action` between subscriptions sharing an identifier)
- **Stale reconnect loop:** a reopened connection was compared against the previous connection's last-message timestamp, so it could be considered stale and reopened immediately
- **Reconnect after disconnect:** a foreground event fired just before `consumer.disconnect()` could reopen the connection 200 ms later
- **URL scheme:** `http` → `ws` rewriting now only touches the scheme instead of the first `http` occurring anywhere in the URL

---

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
