/**
 * @format
 */

import React from 'react';
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable';
import { ApolloProvider } from 'react-apollo';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { AppRegistry, View, Text } from 'react-native';
import { createHttpLink } from 'apollo-link-http';
import { getMainDefinition } from 'apollo-utilities';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { name as appName } from './app.json';
import ActionCableLink from './ActionCableLink';

// Your main app component - replace this with your actual app
const AppWithNavigator = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>ActionCable Apollo Example</Text>
      <Text>Replace this with your actual app components</Text>
    </View>
  );
};

const httpLink = createHttpLink({ uri: 'http://localhost:3000/graphql' });
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable');
const cable = new Cable({});

const hasSubscriptionOperation = ({ query }) => {
  const { kind, operation } = getMainDefinition(query);

  return kind === 'OperationDefinition' && operation === 'subscription';
};

const link = ApolloLink.split(
  hasSubscriptionOperation,
  new ActionCableLink({ actionCable, cable }),
  httpLink
);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
});

const AppWithApollo = () => (
  <ApolloProvider client={client}>
    <AppWithNavigator />
  </ApolloProvider>
);

AppRegistry.registerComponent(appName, () => AppWithApollo);