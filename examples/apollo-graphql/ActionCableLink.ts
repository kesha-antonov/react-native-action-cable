import { ApolloLink, Observable } from '@apollo/client'
import type { FetchResult, Operation } from '@apollo/client'
import { print } from 'graphql'
import type { Cable, Consumer, Subscription } from '@kesha-antonov/react-native-action-cable'

interface ActionCableLinkOptions {
  cable: Cable
  actionCable: Consumer
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
      new Observable<FetchResult>(observer => {
        const channelId = Math.round(Date.now() + Math.random() * 100000).toString(16)

        const channel: Subscription = cable.setChannel(
          'GraphqlChannel', // channel name to which we will pass data from Rails app with `stream_from`
          actionCable.subscriptions.create({
            channel: channelName,
            channelId,
            ...connectionParams,
          }),
        )

        channel
          .on('connected', function () {
            channel.perform(actionName, {
              query: operation.query ? print(operation.query) : null,
              variables: operation.variables,
              operationName: operation.operationName,
            })
          })
          .on('received', function (payload: unknown) {
            const typedPayload = payload as SubscriptionPayload
            if (typedPayload.result.data || typedPayload.result.errors) {
              observer.next(typedPayload.result as FetchResult)
            }

            if (!typedPayload.more) {
              channel.unsubscribe()
              observer.complete()
            }
          })

        return () => {
          channel.unsubscribe()
        }
      }),
  )
}

export default ActionCableLink
