import React from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { useColorMode } from '@docusaurus/theme-common'

// The animated overview on the intro page: a chat carried by one channel,
// from subscribing to reconnecting after the app was in the background.
function Themed() {
  const { colorMode } = useColorMode()
  const Demo = require('./ChatDemo').default
  return <Demo theme={colorMode === 'dark' ? 'dark' : 'light'} />
}

export default function ChatDemo() {
  return (
    <figure
      className="chat-demo"
      role="img"
      aria-label="A chat on an iPhone: the app subscribes to ChatChannel, a typing event shows the dots, the message arrives, a reply is sent with perform, and after the app comes back from the background it reconnects on its own and fetches the message it missed."
    >
      <BrowserOnly fallback={<div className="chat-demo__placeholder" />}>{() => <Themed />}</BrowserOnly>
    </figure>
  )
}
