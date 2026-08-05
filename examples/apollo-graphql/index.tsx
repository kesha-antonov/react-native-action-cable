/**
 * Apollo Client wired to a Rails GraphQL API: queries and mutations over HTTP,
 * subscriptions over ActionCable.
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { registerRootComponent } from 'expo'
import { StatusBar } from 'expo-status-bar'
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'
import { ApolloClient, ApolloLink, InMemoryCache, split } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { HttpLink } from '@apollo/client/link/http'
import { getMainDefinition } from '@apollo/client/utilities'

import ActionCableLink from './ActionCableLink'

// Your app - replace with your actual screens
const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>ActionCable Apollo Example</Text>
      <Text style={styles.subtitle}>Replace this with your actual app components</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.6,
    textAlign: 'center',
  },
})

const httpLink = new HttpLink({ uri: 'http://localhost:3000/graphql' })
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')
const cable = new Cable({})

const hasSubscriptionOperation = ({ query }: { query: Parameters<typeof getMainDefinition>[0] }): boolean => {
  const definition = getMainDefinition(query)

  return definition.kind === 'OperationDefinition' && definition.operation === 'subscription'
}

const link: ApolloLink = split(hasSubscriptionOperation, ActionCableLink({ actionCable, cable }), httpLink)

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
})

const AppWithApollo: React.FC = () => (
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
)

registerRootComponent(AppWithApollo)

export default AppWithApollo
