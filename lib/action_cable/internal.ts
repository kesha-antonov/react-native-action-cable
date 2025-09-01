export interface MessageTypes {
  welcome: 'welcome'
  disconnect: 'disconnect'
  ping: 'ping'
  confirmation: 'confirm_subscription'
  rejection: 'reject_subscription'
}

export interface DisconnectReasons {
  unauthorized: 'unauthorized'
  invalid_request: 'invalid_request'
  server_restart: 'server_restart'
  remote: 'remote'
}

export interface Internal {
  message_types: MessageTypes
  disconnect_reasons: DisconnectReasons
  default_mount_path: string
  protocols: string[]
}

const INTERNAL: Internal = {
  message_types: {
    welcome: 'welcome',
    disconnect: 'disconnect',
    ping: 'ping',
    confirmation: 'confirm_subscription',
    rejection: 'reject_subscription'
  },
  disconnect_reasons: {
    unauthorized: 'unauthorized',
    invalid_request: 'invalid_request',
    server_restart: 'server_restart',
    remote: 'remote'
  },
  default_mount_path: '/cable',
  protocols: ['actioncable-v1-json', 'actioncable-unsupported']
}

export default INTERNAL