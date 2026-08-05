# Apollo GraphQL Integration Example

This example demonstrates how to integrate `@kesha-antonov/react-native-action-cable` with Apollo GraphQL for real-time GraphQL subscriptions in React Native applications.

## Overview

This integration allows you to use GraphQL subscriptions over ActionCable with Apollo Client, providing a seamless way to handle real-time data in your React Native app with a Rails backend.

## Key Components

### 1. ActionCableLink.ts

This is an adapted version of the [graphql-ruby ActionCableLink](https://github.com/rmosolgo/graphql-ruby/blob/master/javascript_client/subscriptions/ActionCableLink.js) that works with the `@kesha-antonov/react-native-action-cable` package interface.

**Key Features:**
- Handles GraphQL subscription operations over ActionCable
- Manages connection lifecycle (connected, received, unsubscribed)
- Integrates seamlessly with Apollo Link

### 2. index.tsx (App Setup)

Shows how to configure Apollo Client with ActionCable for subscriptions while using HTTP for queries and mutations.

**Key Features:**
- Splits GraphQL operations: subscriptions via ActionCable, queries/mutations via HTTP
- Proper Apollo Client setup with both links
- ActionCable consumer and Cable instance initialization

## Installation

First, install the required dependencies:

```bash
yarn add @kesha-antonov/react-native-action-cable @apollo/client graphql rxjs
```

`rxjs` is a required peer dependency of Apollo Client 4 - its links are built on
RxJS observables.

## Usage

### 1. Setup Apollo Client with ActionCable

```typescript
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'
import { ApolloClient, InMemoryCache, split } from '@apollo/client'
import { HttpLink } from '@apollo/client/link/http'
import { getMainDefinition } from '@apollo/client/utilities'
import ActionCableLink from './ActionCableLink'

const httpLink = new HttpLink({ uri: 'http://localhost:3000/graphql' })
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')
const cable = new Cable({})

const hasSubscriptionOperation = ({ query }) => {
  const definition = getMainDefinition(query)
  return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
}

const link = split(
  hasSubscriptionOperation,
  ActionCableLink({ actionCable, cable }),
  httpLink
)

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
})
```

Wrap your app with the provider from `@apollo/client/react`:

```typescript
import { ApolloProvider } from '@apollo/client/react'

const AppWithApollo = () => (
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
)
```

### 2. Use in React Component

```typescript
import React from 'react';
import { useSubscription } from '@apollo/client/react';
import { gql } from '@apollo/client';

const MESSAGE_SUBSCRIPTION = gql`
  subscription MessageAdded {
    messageAdded {
      id
      content
      user {
        name
      }
    }
  }
`;

function ChatComponent() {
  const { data, loading, error } = useSubscription(MESSAGE_SUBSCRIPTION);
  
  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;
  
  return (
    <View>
      {data?.messageAdded && (
        <Text>{data.messageAdded.user.name}: {data.messageAdded.content}</Text>
      )}
    </View>
  );
}
```

## Rails Backend Setup

Your Rails application needs to be configured for GraphQL subscriptions over ActionCable:

### 1. Gemfile

```ruby
gem 'graphql'
gem 'redis' # for ActionCable adapter
```

### 2. GraphQL Channel (app/channels/graphql_channel.rb)

```ruby
class GraphqlChannel < ApplicationCable::Channel
  def subscribed
    @subscription_ids = []
  end

  def execute(data)
    query = data['query']
    variables = data['variables'] || {}
    operation_name = data['operationName']
    
    result = YourSchema.execute(
      query: query,
      variables: variables,
      operation_name: operation_name,
      context: {
        current_user: current_user,
        channel: self
      }
    )

    transmit(result: result.to_h, more: true) unless result.subscription?
  end

  def unsubscribed
    @subscription_ids.each do |sid|
      YourSchema.subscriptions.delete_subscription(sid)
    end
  end
end
```

### 3. GraphQL Schema Configuration

```ruby
class YourSchema < GraphQL::Schema
  use GraphQL::Subscriptions::ActionCableSubscriptions,
      redis: Redis.new

  query QueryType
  mutation MutationType
  subscription SubscriptionType
end
```

## Configuration Options

The `ActionCableLink` constructor accepts these options:

- `actionCable`: ActionCable consumer instance
- `cable`: Cable instance for managing channels
- `channelName`: Channel name (default: 'GraphqlChannel')
- `actionName`: Action name for execute (default: 'execute')
- `connectionParams`: Additional parameters for channel subscription

## Example with Authentication

```javascript
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable', () => ({
  'Authorization': `Bearer ${getCurrentAuthToken()}`
}));

const actionCableLink = new ActionCableLink({ 
  actionCable, 
  cable,
  connectionParams: {
    userId: getCurrentUserId()
  }
});
```

## Troubleshooting

### Common Issues

1. **Subscriptions not working**: Make sure your Rails backend is properly configured with ActionCable and GraphQL subscriptions.

2. **Authentication issues**: Ensure you're passing authentication headers correctly to the ActionCable consumer.

3. **Connection errors**: Check that the WebSocket URL is correct and accessible from your React Native app.

### Debug Mode

Enable ActionCable debugging to see connection details:

```javascript
ActionCable.startDebugging(); // Enable logging
ActionCable.stopDebugging();  // Disable logging
```

## Credits

This example was contributed by [@ccfz](https://github.com/ccfz) and adapts the graphql-ruby ActionCableLink for use with this package's interface.

## Related Resources

- [graphql-ruby ActionCable Subscriptions](https://graphql-ruby.org/subscriptions/action_cable_implementation.html)
- [Apollo Client Documentation](https://www.apollographql.com/docs/react/)
- [Rails ActionCable Guide](https://guides.rubyonrails.org/action_cable_overview.html)