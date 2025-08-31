class Cable {
  constructor(channels = {}) {
    this.channels = channels
  }

  channel(name) {
    return this.channels[name]
  }

  setChannel(name, channel) {
    this.channels[name] = channel
    return channel
  }
}

module.exports = Cable