class Cable {
  private channels: Record<string, any>;

  constructor(channels: Record<string, any> = {}) {
    this.channels = channels;
  }

  channel = (name: string) => {
    return this.channels[name];
  }

  setChannel = (name: string, channel: any) => {
    this.channels[name] = channel;
    return channel;
  }
}

export default Cable;