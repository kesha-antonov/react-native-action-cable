/**
 * @format
 */

import React from 'react'
import { ActionCable, Cable } from '@kesha-antonov/react-native-action-cable'
import { ApolloProvider, ApolloClient, InMemoryCache, ApolloLink, split } from '@apollo/client'
import { HttpLink } from '@apollo/client/link/http'
import { getMainDefinition } from '@apollo/client/utilities'
import { AppRegistry, View, Text, StyleSheet } from 'react-native'

import appJson from './app.json'
import ActionCableLink from './ActionCableLink'

const appName = appJson.name

// Your main app component - replace this with your actual app
const AppWithNavigator: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text>ActionCable Apollo Example</Text>
      <Text>Replace this with your actual app components</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

const httpLink = new HttpLink({ uri: 'http://localhost:3000/graphql' })
const actionCable = ActionCable.createConsumer('ws://localhost:3000/cable')
const cable = new Cable({})

interface DefinitionNode {
  kind: string
  operation?: string
}

const hasSubscriptionOperation = ({ query }: { query: unknown }): boolean => {
  const definition = getMainDefinition(query as Parameters<typeof getMainDefinition>[0]) as DefinitionNode
  const { kind, operation } = definition

  return kind === 'OperationDefinition' && operation === 'subscription'
}

const link: ApolloLink = split(hasSubscriptionOperation, ActionCableLink({ actionCable, cable }), httpLink)

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
})

const AppWithApollo: React.FC = () => (
  <ApolloProvider client={client}>
    <AppWithNavigator />
  </ApolloProvider>
)

AppRegistry.registerComponent(appName, () => AppWithApollo)
