# Contributing

Thanks for considering a contribution. This library is small and dependency-light
on purpose, so almost any change is easy to review and easy to test.

## Getting set up

The repo uses Yarn 4 via Corepack and the Node version pinned in `.nvmrc`.

```bash
corepack enable
yarn install
```

## Working on a change

```bash
yarn test           # run the Jest suite
yarn test:watch     # re-run on change while you work
yarn test:coverage  # run with a coverage report
yarn typecheck      # type-check the library and the tests
yarn lint           # ESLint
yarn lint:fix       # ESLint with autofix
```

CI runs lint, typecheck, and the test suite on Node 20, 22, and 24. Running
`yarn lint && yarn typecheck && yarn test` locally covers the same ground.

## Tests

The suite in [`__tests__`](__tests__) drives the real connection code against a
WebSocket double that behaves like a Rails ActionCable server, so tests exercise
actual reconnect, subscribe, and message-dispatch paths rather than mocks of our
own code. New behaviour should come with a test at that level.

## Code style

ESLint enforces the house style, so `yarn lint:fix` handles the mechanical part.
The short version: two-space indent, single quotes, no semicolons, trailing
commas in multiline literals.

Keep the library dependency-free where possible. It ships as TypeScript source
with no build step and no native module, which is what lets it run unmodified on
the New Architecture, in Expo Go, and on web.

## Relationship to Rails ActionCable

Code under `lib/action_cable` is adapted from
[Rails ActionCable](https://github.com/rails/rails/tree/main/actioncable/app/javascript/action_cable)
and is deliberately kept close to upstream so it can be re-synced. If you change
a file there, please note whether the change is a port of an upstream change or
an intentional divergence for React Native. The current divergences are listed
in the README under Credits.

## Pull requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Describe what changed and why. If it fixes a bug, a failing test in the same PR
is the clearest possible description.

## Reporting bugs

Open an [issue](https://github.com/kesha-antonov/react-native-action-cable/issues)
with your React Native version, whether you are on Expo or bare, your Rails
version, and a minimal reproduction if you can manage one. Connection problems
are much easier to diagnose with `ActionCable.startDebugging()` output attached.
