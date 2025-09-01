export interface Channels {
  [key: string]: any
}

class Cable {
  channels: Channels

  constructor(channels: Channels = {}) {
    this.channels = channels
  }

  channel = (name: string): any => {
    return this.channels[name]
  }

  setChannel = (name: string, channel: any): any => {
    this.channels[name] = channel
    return channel
  }
}

export default Cable