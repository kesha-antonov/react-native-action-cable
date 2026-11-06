import { MessageSquareMore, Plug, RefreshCw, Send, Inbox } from 'lucide-react'
import { Bubble, LockScreen, Phone, Receipt, Spinner, Stage, Stamp, States, Thread, WALLPAPER, type Act } from '../stageshow/kit'
import './chat.css'

// How @kesha-antonov/react-native-action-cable carries a chat, told on one
// conversation. A list beside the phone names each call as it happens:
//   1. Subscribe: the app opens, the pill says Connecting, then Connected.
//   2. Custom events: Rails broadcasts { action: 'typing' } and the dots show.
//   3. Received: the dots grow into Maya's message.
//   4. Perform: a reply is typed and sent; Delivered once Rails echoes it.
//   5. Reconnect: the app goes to the background, the socket is gone; back in
//      the foreground it reconnects by itself, connected({ reconnected: true })
//      fires and the app fetches the message it missed.
// The payoff holds, then the added messages leave and the loop starts again
// on the opening frame.
//
// Real strings: the five feature names and calls, the conversation.

type Link = 'off' | 'connecting' | 'connected'

type S = {
  step: number
  app: boolean
  link: Link
  pill: boolean
  typing: boolean
  reply: boolean
  draft: string
  sent: boolean
  delivered: boolean
  missed: boolean
}

const initial: S = { step: 0, app: true, link: 'connecting', pill: false, typing: false, reply: false, draft: '', sent: false, delivered: false, missed: false }

const poster: S = { ...initial, step: 6, link: 'connected', reply: true, sent: true, delivered: true, missed: true }

const REPLY = "I'll wait under the big clock"
const MINE = 'See you there'
const MISSED = 'Got you a coffee too'

const FEATURES = [
  { icon: Plug, title: 'Subscribe to a channel', code: "subscriptions.create('ChatChannel')" },
  { icon: MessageSquareMore, title: 'Your own events', code: "channel.on('typing', showDots)" },
  { icon: Inbox, title: 'Receive broadcasts', code: "channel.on('received', addMessage)" },
  { icon: Send, title: 'Send to Rails', code: "channel.perform('speak', { text })" },
  { icon: RefreshCw, title: 'Reconnects on its own', code: 'connected({ reconnected: true })' },
]

async function script(a: Act<S>) {
  a.mark('start')

  // 1. The app subscribes: Connecting, then Connected, and the pill leaves
  await a.set({ step: 1, pill: true, link: 'connecting' })
  await a.wait(1100)
  await a.set({ link: 'connected' })
  await a.wait(900)
  await a.set({ pill: false })
  await a.wait(300)

  // 2. Rails broadcasts a typing action; it arrives as its own event
  a.mark('typing')
  await a.set({ step: 2, typing: true })
  await a.wait(1700)

  // 3. The message itself: the dots grow into it
  a.mark('received')
  await a.set({ step: 3, typing: false, reply: true })
  await a.wait(1400)

  // 4. A reply, sent with perform; Delivered when the broadcast comes back
  a.mark('send')
  a.put({ step: 4 })
  await a.click('compose')
  await a.type('draft', MINE, { interval: 60 })
  await a.wait(300)
  await a.click('send')
  await a.set({ sent: true, draft: '' })
  await a.wait(700)
  await a.set({ delivered: true })
  await a.wait(1000)

  // 5. The app goes to the background and the socket closes. Back in the
  //    foreground it reconnects by itself and fetches what it missed
  a.mark('background')
  await a.set({ step: 5, app: false, link: 'off' })
  await a.wait(1500)
  a.mark('reconnect')
  await a.set({ app: true, pill: true, link: 'connecting' })
  await a.wait(1100)
  await a.set({ link: 'connected' })
  await a.wait(500)
  await a.set({ missed: true })
  await a.wait(1100)
  await a.set({ pill: false })

  // The payoff holds with every call done
  a.put({ step: 6 })
  await a.wait(2200)

  // What the story added leaves, newest first, and the next session opens
  a.mark('reset')
  a.put({ step: 0 })
  await a.set({ missed: false })
  await a.wait(150)
  await a.set({ delivered: false })
  await a.set({ sent: false })
  await a.wait(150)
  await a.set({ reply: false })
  await a.move(a.layout === 'wide' ? { x: 740, y: 470 } : { x: 320, y: 550 })
  await a.snap({ link: 'connecting' })
}

function Pill({ s }: { s: S }) {
  return (
    <div className="ac-pill" data-show={s.pill || undefined} aria-hidden>
      <States
        value={s.link === 'connected' ? 'on' : 'wait'}
        states={{
          wait: (
            <span className="ac-pill__state">
              <Spinner size={14} className="ac-pill__spin" />
              Connecting
            </span>
          ),
          on: (
            <span className="ac-pill__state">
              <span className="ac-pill__dot" />
              Connected
            </span>
          ),
        }}
      />
    </div>
  )
}

function ArrowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 13V3.5M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Chat({ s }: { s: S }) {
  return (
    <div className="ac-app" data-on={s.app || undefined}>
      <Pill s={s} />
      <Thread className="ac-thread">
        <Stamp>Today 18:12</Stamp>
        <Bubble from="them">Still on for the film at 7?</Bubble>
        <Bubble from="me">Yes! Got us row 7</Bubble>
        <Bubble from="them">Perfect, by the aisle?</Bubble>
        <Bubble from="me">Of course</Bubble>
        <Stamp>Today 18:40</Stamp>
        <Bubble from="them">Are you on the train?</Bubble>
        <Bubble from="me">Just got on, 20 min</Bubble>
        {(s.typing || s.reply) && (
          <Bubble from="them" typing={s.typing}>
            {REPLY}
          </Bubble>
        )}
        {s.sent && (
          <Bubble from="me" source="draft">
            {MINE}
          </Bubble>
        )}
        <Receipt show={s.delivered}>Delivered</Receipt>
        {s.missed && <Bubble from="them">{MISSED}</Bubble>}
      </Thread>
      <div className="ac-compose">
        <span className="ac-plus" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="ac-field" data-target="compose">
          <span className="ac-field__text" data-target="draft">
            {s.draft}
            {s.draft && <i className="ac-caret" data-snap />}
          </span>
          <span className="ac-field__ph" data-hide={s.draft ? '' : undefined}>
            Message
          </span>
          <span className="ac-send" data-target="send" data-show={s.draft ? '' : undefined}>
            <ArrowUp />
          </span>
        </span>
      </div>
    </div>
  )
}

function Features({ step }: { step: number }) {
  return (
    <ol className="ac-features">
      {FEATURES.map((f, i) => {
        const n = i + 1
        const state = step === n ? 'on' : step > n ? 'done' : 'next'
        const Glyph = f.icon
        return (
          <li key={f.title} className="ac-feature" data-state={state}>
            <span className="ac-feature__tile">
              <Glyph size={16} strokeWidth={2.2} />
            </span>
            <span className="ac-feature__words">
              <span className="ac-feature__title">{f.title}</span>
              <code className="ac-feature__code">{f.code}</code>
            </span>
          </li>
        )
      })}
      <li className="ac-more">Plus auth headers read fresh on every connect, Rails-style mixins and a Jest mock. Pure JS, works in Expo.</li>
    </ol>
  )
}

/** Compact: the call in play, as a caption over the top of the stage. */
function Caption({ step }: { step: number }) {
  const n = Math.min(step, FEATURES.length)
  return (
    <div className="ac-caption" data-show={(n > 0 && step <= FEATURES.length) || undefined}>
      {FEATURES.map((f, i) => {
        const Glyph = f.icon
        return (
          <span key={f.title} className="ac-caption__item" data-on={n === i + 1 || undefined}>
            <span className="ac-caption__title">
              <Glyph size={14} strokeWidth={2.4} />
              {f.title}
            </span>
            <code className="ac-caption__code">{f.code}</code>
          </span>
        )
      })}
    </div>
  )
}

export default function ChatDemo({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark'
  return (
    <Stage<S>
      width={800}
      height={480}
      compact={{ below: 640, width: 358, height: 560 }}
      initial={initial}
      poster={poster}
      script={script}
      play="loop"
      theme={theme}
      fill
      cursor={{ at: { wide: { x: 740, y: 470 }, compact: { x: 320, y: 550 } }, style: 'touch' }}
      className="ac"
    >
      {(s, _rect, layout) => (
        <>
          {layout === 'wide' ? <Features step={s.step} /> : <Caption step={s.step} />}
          <Phone width={layout === 'wide' ? 340 : 326} dark={dark || !s.app} wallpaper={WALLPAPER} className="ac-phone">
            <LockScreen clock={false} className="ac-lock" data-away={s.app || undefined} />
            <Chat s={s} />
          </Phone>
        </>
      )}
    </Stage>
  )
}
