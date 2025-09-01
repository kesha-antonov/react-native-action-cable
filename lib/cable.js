/**
 * @typedef {Record<string, any>} Channels
 */

class Cable {
  /**
   * @param {Channels} channels
   */
  constructor(channels = {}) {
    /** @type {Channels} */
    this.channels = channels
  }

  /**
   * @param {string} name
   * @returns {any}
   */
  channel = (name) => {
    return this.channels[name]
  }

  /**
   * @param {string} name
   * @param {any} channel
   * @returns {any}
   */
  setChannel = (name, channel) => {
    this.channels[name] = channel
    return channel
  }
}

module.exports = Cable