import { ApolloLink, Observable, Operation, FetchResult } from '@apollo/client'
import { print } from 'graphql'
import { Cable } from '@kesha-antonov/react-native-action-cable'

interface ActionCableConsumer {
  subscriptions: {
    create: (params: Record<string, unknown>) => Subscription
  }
}

interface Subscription {
  on: (event: string, callback: (data: unknown) => void) => Subscription
  perform: (action: string, data: Record<string, unknown>) => void
  unsubscribe: () => void
}

interface ActionCableLinkOptions {
  cable: Cable
  actionCable: ActionCableConsumer
  connectionParams?: Record<string, unknown>
  channelName?: string
  actionName?: string
}

interface SubscriptionPayload {
  result: {
    data?: unknown
    errors?: unknown[]
  }
  more: boolean
}

function ActionCableLink(options: ActionCableLinkOptions): ApolloLink {
  const { cable, actionCable } = options
  const { connectionParams = {} } = options
  const channelName = options.channelName || 'GraphqlChannel'
  const actionName = options.actionName || 'execute'

  return new ApolloLink(
    (operation: Operation) =>
      new Observable<FetchResult>((observer) => {
        const channelId = Math.round(Date.now() + Math.random() * 100000).toString(16)

        const channel = cable.setChannel(
          'GraphqlChannel', // channel name to which we will pass data from Rails app with `stream_from`
          actionCable.subscriptions.create({
            channel: channelName,
            channelId,
            ...connectionParams,
          })
        )

        channel
          .on('connected', function (this: Subscription) {
            this.perform(actionName, {
              query: operation.query ? print(operation.query) : null,
              variables: operation.variables,
              // @ts-expect-error operationId may not exist on Operation type
              operationId: operation.operationId,
              operationName: operation.operationName,
            })
          })
          .on('received', function (this: Subscription, payload: unknown) {
            const typedPayload = payload as SubscriptionPayload
            if (typedPayload.result.data || typedPayload.result.errors) {
              observer.next(typedPayload.result as FetchResult)
            }

            if (!typedPayload.more) {
              this.unsubscribe()
              observer.complete()
            }
          })

        return () => {
          channel.unsubscribe()
        }
      })
  )
}

export default ActionCableLink
