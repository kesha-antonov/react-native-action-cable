/**
 * Jest setup file for mocking @kesha-antonov/react-native-action-cable
 * Place this in your Jest setup files or import it at the top of your test files
 */

interface MockSubscription {
  on: jest.Mock
  removeListener: jest.Mock
  perform: jest.Mock
  unsubscribe: jest.Mock
  identifier: string
  consumer: null
}

interface MockSubscriptions {
  create: jest.Mock
  subscriptions: unknown[]
  add: jest.Mock
  remove: jest.Mock
  reject: jest.Mock
}

interface MockConnection {
  open: jest.Mock
  close: jest.Mock
  send: jest.Mock
  isActive: jest.Mock
  isOpen: jest.Mock
}

interface MockConsumer {
  subscriptions: MockSubscriptions
  connection: MockConnection
  url: string
  send: jest.Mock
  connect: jest.Mock
  disconnect: jest.Mock
  ensureActiveConnection: jest.Mock
}

// Mock subscription object
const createMockSubscription = (): MockSubscription => ({
  on: jest.fn().mockReturnThis(),
  removeListener: jest.fn().mockReturnThis(),
  perform: jest.fn(),
  unsubscribe: jest.fn(),
  identifier: 'test-channel',
  consumer: null,
})

// Mock subscriptions collection
const createMockSubscriptions = (): MockSubscriptions => ({
  create: jest.fn().mockImplementation(() => createMockSubscription()),
  subscriptions: [],
  add: jest.fn(),
  remove: jest.fn(),
  reject: jest.fn(),
})

// Mock connection object
const createMockConnection = (): MockConnection => ({
  open: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
  isActive: jest.fn().mockReturnValue(true),
  isOpen: jest.fn().mockReturnValue(true),
})

// Mock consumer object
const createMockConsumer = (): MockConsumer => ({
  subscriptions: createMockSubscriptions(),
  connection: createMockConnection(),
  url: 'ws://localhost:3000/cable',
  send: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  ensureActiveConnection: jest.fn(),
})

// Mock ActionCable object (not a constructor, but an object with methods)
const MockActionCable = {
  INTERNAL: {},
  WebSocket: globalThis.WebSocket || jest.fn(),
  logger: {
    log: jest.fn(),
  },
  createConsumer: jest.fn().mockImplementation((_url: string, _headers = {}) => createMockConsumer()),
  startDebugging: jest.fn(),
  stopDebugging: jest.fn(),
  log: jest.fn(),
  debugging: false,
}

// Mock Cable class
const MockCable = jest.fn().mockImplementation((channels: Record<string, unknown> = {}) => ({
  channels,
  channel: jest.fn().mockImplementation((name: string) => channels[name]),
  setChannel: jest.fn().mockImplementation((name: string, subscription: unknown) => {
    channels[name] = subscription
    return subscription
  }),
}))

// Mock ActionCable and Cable for Jest tests
jest.mock('@kesha-antonov/react-native-action-cable', () => ({
  ActionCable: MockActionCable,
  Cable: MockCable,
}))

export { MockActionCable, MockCable, createMockSubscription, createMockConsumer }
