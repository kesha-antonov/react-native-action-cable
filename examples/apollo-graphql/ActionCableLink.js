import { ApolloLink, Observable } from 'apollo-link';

const printer = require('graphql/language/printer');

function ActionCableLink(options) {
  const { cable, actionCable } = options;
  const { connectionParams = {} } = options;
  const channelName = options.channelName || 'GraphqlChannel';
  const actionName = options.actionName || 'execute';

  return new ApolloLink(operation => (
    new Observable((observer) => {
      const channelId = Math.round(
        Date.now() + Math.random() * 100000
      ).toString(16);

      const channel = cable.setChannel(
        'GraphqlChannel', // channel name to which we will pass data from Rails app with `stream_from`
        actionCable.subscriptions.create({
          channel: channelName,
          channelId,
          ...connectionParams
        })
      );

      /* eslint-disable func-names */
      channel.on('connected', function () {
        this.perform(
          actionName,
          {
            query: operation.query ? printer.print(operation.query) : null,
            variables: operation.variables,
            operationId: operation.operationId,
            operationName: operation.operationName
          }
        );
      }).on('received', function (payload) {
        if (payload.result.data || payload.result.errors) {
          observer.next(payload.result);
        }

        if (!payload.more) {
          this.unsubscribe();
          observer.complete();
        }
      });

      /* eslint-enable func-names */

      return channel;
    })
  ));
}

module.exports = ActionCableLink;