/**
 * A WebSocket double that mimics a Rails ActionCable server.
 *
 * It deliberately does NOT expose the `CONNECTING`/`OPEN`/... constants as
 * enumerable statics, which is what a custom WebSocket implementation injected
 * through `ActionCable.WebSocket` typically looks like.
 */

export const READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

export interface MockWebSocketOptions {
  headers?: Record<string, string>
}

export interface SentCommand {
  command: string
  identifier: string
  data?: string
}

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static autoOpen = true
  static autoWelcome = true
  static autoConfirmSubscriptions = true
  static negotiatedProtocol = 'actioncable-v1-json'

  static get last(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }

  static reset(): void {
    MockWebSocket.instances = []
    MockWebSocket.autoOpen = true
    MockWebSocket.autoWelcome = true
    MockWebSocket.autoConfirmSubscriptions = true
    MockWebSocket.negotiatedProtocol = 'actioncable-v1-json'
  }

  url: string
  protocols: string[]
  options?: MockWebSocketOptions
  readyState: number = READY_STATE.CONNECTING
  protocol: string = ''
  sent: string[] = []

  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null

  constructor(url: string, protocols: string[] = [], options?: MockWebSocketOptions) {
    this.url = url
    this.protocols = protocols
    this.options = options
    MockWebSocket.instances.push(this)

    // Real sockets never open synchronously inside the constructor - the
    // client still has to install its event handlers
    if (MockWebSocket.autoOpen) {
      setTimeout(() => {
        if (this.readyState === READY_STATE.CONNECTING) this.acceptConnection()
      }, 0)
    }
  }

  // Server side helpers

  acceptConnection(): void {
    this.readyState = READY_STATE.OPEN
    this.protocol = MockWebSocket.negotiatedProtocol
    this.onopen?.()
    if (MockWebSocket.autoWelcome) {
      this.deliver({ type: 'welcome' })
    }
  }

  deliver(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }

  deliverRaw(data: string): void {
    this.onmessage?.({ data })
  }

  broadcast(identifier: string, message: unknown): void {
    this.deliver({ identifier, message })
  }

  confirmSubscription(identifier: string): void {
    this.deliver({ type: 'confirm_subscription', identifier })
  }

  rejectSubscription(identifier: string): void {
    this.deliver({ type: 'reject_subscription', identifier })
  }

  fail(event: unknown = new Error('connection failed')): void {
    this.onerror?.(event)
  }

  /** Simulates the socket dying without the client asking for it. */
  drop(): void {
    this.readyState = READY_STATE.CLOSED
    this.onclose?.({ wasClean: false })
  }

  get commands(): SentCommand[] {
    return this.sent.map(raw => JSON.parse(raw) as SentCommand)
  }

  commandsOfType(command: string): SentCommand[] {
    return this.commands.filter(c => c.command === command)
  }

  // WebSocket API

  send(raw: string): void {
    this.sent.push(raw)
    const message = JSON.parse(raw) as SentCommand
    if (message.command === 'subscribe' && MockWebSocket.autoConfirmSubscriptions) {
      // A server confirmation can never arrive in the same tick as the command
      setTimeout(() => this.confirmSubscription(message.identifier), 0)
    }
  }

  close(): void {
    if (this.readyState === READY_STATE.CLOSED) return
    this.readyState = READY_STATE.CLOSED
    this.onclose?.({ wasClean: true })
  }
}

export default MockWebSocket
