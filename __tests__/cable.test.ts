import Cable from '../lib/cable'
import {
  ActionCable,
  Cable as ExportedCable,
  Connection,
  ConnectionMonitor,
  Consumer,
  INTERNAL,
  Subscription,
  SubscriptionGuarantor,
  Subscriptions,
  createWebSocketURL,
} from '../index'
import ExportedActionCable from '../lib/action_cable/action_cable'

describe('Cable', () => {
  it('starts empty', () => {
    expect(new Cable().channels).toEqual({})
  })

  it('accepts pre-registered channels', () => {
    const channel = { name: 'chat' }

    expect(new Cable({ ChatChannel: channel }).channel('ChatChannel')).toBe(channel)
  })

  it('returns the channel it registers, so calls can be chained', () => {
    const cable = new Cable()
    const channel = { name: 'chat' }

    expect(cable.setChannel('ChatChannel', channel)).toBe(channel)
    expect(cable.channel('ChatChannel')).toBe(channel)
  })

  it('replaces a channel registered under the same name', () => {
    const cable = new Cable()
    cable.setChannel('ChatChannel', { id: 1 })

    cable.setChannel('ChatChannel', { id: 2 })

    expect(cable.channel('ChatChannel')).toEqual({ id: 2 })
  })

  it('returns undefined for an unknown channel', () => {
    expect(new Cable().channel('Unknown')).toBeUndefined()
  })

  it('lets channels be removed from the registry', () => {
    const cable = new Cable()
    cable.setChannel('ChatChannel', { id: 1 })

    delete cable.channels.ChatChannel

    expect(cable.channel('ChatChannel')).toBeUndefined()
  })
})

describe('package entry point', () => {
  it('exports ActionCable and Cable', () => {
    expect(ActionCable).toBe(ExportedActionCable)
    expect(ExportedCable).toBe(Cable)
  })

  it('exports the building blocks the way Rails ActionCable does', () => {
    expect(typeof Connection).toBe('function')
    expect(typeof ConnectionMonitor).toBe('function')
    expect(typeof Consumer).toBe('function')
    expect(typeof Subscription).toBe('function')
    expect(typeof Subscriptions).toBe('function')
    expect(typeof SubscriptionGuarantor).toBe('function')
    expect(INTERNAL).toBe(ActionCable.INTERNAL)
  })

  it('exports createWebSocketURL', () => {
    expect(createWebSocketURL('https://example.com/cable')).toBe('wss://example.com/cable')
    expect(createWebSocketURL(() => 'http://example.com/cable')).toBe('ws://example.com/cable')
  })
})
