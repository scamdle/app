'use client'

import { useCallback, useRef, useState, type ReactNode } from 'react'

import type { Guess, TokenMark } from '@/lib/scoring/textFlags'
import { tokenize } from '@/lib/scoring/tokenize'

import { Button } from './Button'
import type { RenderText } from './views'

const WORD_STYLES: Record<TokenMark['state'] | 'idle' | 'checking', string> = {
  idle: 'cursor-pointer underline decoration-mist decoration-dotted decoration-2 underline-offset-4 hover:bg-sun/30 hover:decoration-navy',
  checking: 'bg-mist',
  found: 'bg-good-soft font-bold text-good',
  wrong: 'bg-bad-soft text-bad line-through decoration-2',
  missed: 'bg-miss-soft font-bold text-miss outline-2 outline-dashed outline-miss',
}

const keyOf = (segment: string, token: number) => `${segment}:${token}`

// What the server says after each tap. `done` is true once the level is over.
export type SpotResponse = { found: number; wrong: number; marks: TokenMark[]; done: boolean }

// Tap-the-words game, shared by 3-task levels and scenario step 2. The caller draws the
// content with the `text` renderer and decides what to send to the server.
export function SpotText<R extends SpotResponse>({ flagCount, maxWrong, check, onDone, children }: {
  flagCount: number
  maxWrong: number
  check: (guesses: Guess[], giveUp: boolean) => Promise<R>
  onDone: (response: R, guesses: Guess[]) => void
  children: (text: RenderText) => ReactNode
}) {
  const guesses = useRef<Guess[]>([])
  const [latest, setLatest] = useState<R | null>(null)
  const [checking, setChecking] = useState<string[]>([])
  const [error, setError] = useState(false)
  const finished = Boolean(latest?.done)

  const send = useCallback(
    async (giveUp: boolean) => {
      try {
        // Server Actions run one at a time and every call replays all guesses, so the newest answer is complete.
        const sent = [...guesses.current]
        const response = await check(sent, giveUp)
        setLatest((current) => (current?.done ? current : response))
        setChecking([])
        setError(false)
        if (response.done) onDone(response, sent)
      } catch {
        setChecking([])
        setError(true)
      }
    },
    [check, onDone],
  )

  const marks = new Map((latest?.marks ?? []).map((mark) => [keyOf(mark.segment, mark.token), mark.state]))

  const tap = (segment: string, token: number) => {
    const key = keyOf(segment, token)
    if (finished || marks.has(key) || checking.includes(key)) return
    guesses.current.push({ segment, token })
    setChecking((list) => [...list, key])
    void send(false)
  }

  // Inline spans rather than buttons, so a long sentence wraps like normal text and its
  // highlight follows the lines. Role, tabIndex and keys give them button behaviour.
  const render: RenderText = (segment, value) =>
    tokenize(value).map((token) => {
      if (token.index === null) return token.text
      const key = keyOf(segment, token.index)
      const state = marks.get(key) ?? (checking.includes(key) ? 'checking' : 'idle')
      const settled = state !== 'idle'
      const inactive = finished && !settled
      return (
        <span
          key={token.start}
          role="button"
          tabIndex={inactive ? -1 : 0}
          aria-pressed={settled}
          aria-disabled={inactive || undefined}
          onClick={() => tap(segment, token.index!)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              tap(segment, token.index!)
            }
          }}
          className={`rounded-md px-1 py-1 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] ${inactive ? '' : WORD_STYLES[state]}`}
        >
          {token.text}
        </span>
      )
    })

  const found = latest?.found ?? 0
  const wrongLeft = maxWrong - (latest?.wrong ?? 0)

  return (
    <>
      <div aria-live="polite" className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xl font-bold">
        <span>
          Red flags found: <span className="text-sun">{found}/{flagCount}</span>
        </span>
        <span>Wrong guesses left: <span className="text-sun">{wrongLeft}</span></span>
      </div>

      {children(render)}

      {error && <p role="alert" className="mt-3 font-bold text-sun">Something went wrong checking that. Please tap again.</p>}

      {!finished && (
        <Button look="plain" className="mt-5" onClick={() => void send(true)}>
          I’m done
        </Button>
      )}
    </>
  )
}
