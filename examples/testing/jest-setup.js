/**
 * Jest setup file for mocking @kesha-antonov/react-native-action-cable
 * Place this in your Jest setup files or import it at the top of your test files
 */

// Mock ActionCable and Cable for Jest tests
jest.mock('@kesha-antonov/react-native-action-cable', () => {
  // Mock subscription object
  const createMockSubscription = () => ({
    on: jest.fn().mockReturnThis(),
    removeListener: jest.fn().mockReturnThis(),
    perform: jest.fn(),
    unsubscribe: jest.fn(),
    identifier: 'test-channel',
    consumer: null,
  });

  // Mock subscriptions collection
  const createMockSubscriptions = () => ({
    create: jest.fn().mockImplementation(() => createMockSubscription()),
    subscriptions: [],
    add: jest.fn(),
    remove: jest.fn(),
    reject: jest.fn(),
  });

  // Mock connection object
  const createMockConnection = () => ({
    open: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
    isActive: jest.fn().mockReturnValue(true),
    isOpen: jest.fn().mockReturnValue(true),
  });

  // Mock consumer object
  const createMockConsumer = () => ({
    subscriptions: createMockSubscriptions(),
    connection: createMockConnection(),
    url: 'ws://localhost:3000/cable',
    send: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    ensureActiveConnection: jest.fn(),
  });

  // Mock ActionCable object (not a constructor, but an object with methods)
  const MockActionCable = {
    INTERNAL: {},
    WebSocket: global.WebSocket || jest.fn(),
    logger: {
      log: jest.fn(),
    },
    createConsumer: jest.fn().mockImplementation((url, headers = {}) => createMockConsumer()),
    startDebugging: jest.fn(),
    stopDebugging: jest.fn(),
    log: jest.fn(),
    debugging: false,
  };

  // Mock Cable class
  const MockCable = jest.fn().mockImplementation((channels = {}) => ({
    channels,
    channel: jest.fn().mockImplementation((name) => channels[name]),
    setChannel: jest.fn().mockImplementation((name, subscription) => {
      channels[name] = subscription;
      return subscription;
    }),
  }));

  return {
    ActionCable: MockActionCable,
    Cable: MockCable,
  };
});