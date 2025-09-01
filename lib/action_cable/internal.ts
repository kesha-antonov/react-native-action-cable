export interface MessageTypes {
  welcome: 'welcome'
  ping: 'ping'
  confirmation: 'confirm_subscription'
  rejection: 'reject_subscription'
}

export interface Internal {
  message_types: MessageTypes
  default_mount_path: string
  protocols: string[]
}

const INTERNAL: Internal = {
  message_types: {
    welcome: 'welcome',
    ping: 'ping',
    confirmation: 'confirm_subscription',
    rejection: 'reject_subscription'
  },
  default_mount_path: '/cable',
  protocols: ['actioncable-v1-json', 'actioncable-unsupported']
}

export default INTERNAL