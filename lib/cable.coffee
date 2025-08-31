class Cable
  constructor: (@channels) ->

  channel: (name) =>
    @channels[name]

  setChannel: (name, channel) =>
    @channels[name] = channel
    channel

export default Cable
