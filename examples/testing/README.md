# Jest Mocking Examples

This directory contains comprehensive examples of how to mock `@kesha-antonov/react-native-action-cable` for Jest tests.

## Files

- **`jest-setup.js`** - Complete Jest mock setup that you can import or include in your Jest configuration
- **`ChatComponent.js`** - Example React component using ActionCable (for demonstration purposes)
- **`ChatComponent.test.js`** - Comprehensive test file showing different testing scenarios

## Quick Start

### Option 1: Global Mock Setup

Add the mock to your Jest setup files by including `jest-setup.js` in your `jest.config.js`:

```javascript
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/path/to/jest-setup.js'],
  // ... other Jest config
};
```

### Option 2: Import in Test Files

Import the mock setup at the top of your test files:

```javascript
import './path/to/jest-setup';
```

### Option 3: Inline Mock

For custom mocking needs, you can create inline mocks in your test files:

```javascript
jest.mock('@kesha-antonov/react-native-action-cable', () => ({
  ActionCable: {
    createConsumer: jest.fn().mockReturnValue({
      subscriptions: {
        create: jest.fn().mockReturnValue({
          on: jest.fn().mockReturnThis(),
          removeListener: jest.fn().mockReturnThis(),
          perform: jest.fn(),
          unsubscribe: jest.fn(),
        }),
      },
      connection: {
        isActive: jest.fn().mockReturnValue(true),
        isOpen: jest.fn().mockReturnValue(true),
      },
    }),
    startDebugging: jest.fn(),
    stopDebugging: jest.fn(),
  },
  Cable: jest.fn().mockImplementation(() => ({
    channels: {},
    channel: jest.fn(),
    setChannel: jest.fn(),
  })),
}));
```

## Testing Patterns

### Testing Connection State

```javascript
it('should handle connection state changes', () => {
  const { getByText } = render(<YourComponent />);
  
  // Simulate connection
  const connectedHandler = mockSubscription.on.mock.calls
    .find(call => call[0] === 'connected')[1];
  connectedHandler();
  
  expect(getByText('Connected')).toBeTruthy();
});
```

### Testing Message Reception

```javascript
it('should handle received messages', () => {
  const { getByText } = render(<YourComponent />);
  
  // Simulate message reception
  const receivedHandler = mockSubscription.on.mock.calls
    .find(call => call[0] === 'received')[1];
  receivedHandler({ type: 'new_message', data: 'Hello' });
  
  expect(getByText('Hello')).toBeTruthy();
});
```

### Testing Message Sending

```javascript
it('should send messages through channel', () => {
  const { getByTestId } = render(<YourComponent />);
  
  fireEvent.press(getByTestId('send-button'));
  
  expect(mockSubscription.perform).toHaveBeenCalledWith('send_message', {
    text: expect.any(String)
  });
});
```

### Testing Cleanup

```javascript
it('should clean up subscriptions on unmount', () => {
  const { unmount } = render(<YourComponent />);
  
  unmount();
  
  expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  expect(mockSubscription.removeListener).toHaveBeenCalledTimes(3);
});
```

## Common Issues and Solutions

### Issue: Mock not working with ES modules
If you're using ES modules and the mock isn't working, make sure you have the mock at the top level of your test file before any imports.

### Issue: Need to test specific subscription behavior
You can access and customize the mock subscription object in your tests:

```javascript
beforeEach(() => {
  mockSubscription = {
    on: jest.fn().mockReturnThis(),
    perform: jest.fn().mockImplementation((action, data) => {
      // Custom behavior for testing
    }),
  };
  ActionCable.subscriptions.create.mockReturnValue(mockSubscription);
});
```

### Issue: Testing connection errors
You can simulate connection errors by mocking the connection methods:

```javascript
beforeEach(() => {
  ActionCable.createConsumer.mockReturnValue({
    connection: {
      isActive: jest.fn().mockReturnValue(false),
      isOpen: jest.fn().mockReturnValue(false),
    },
    // ... other methods
  });
});
```