'use client'

import { useState } from 'react'
import type { Exercise } from '@/payload-types'

type Email = NonNullable<Exercise['email']>
type Hotspot = NonNullable<Email['hotspots']>[number]

// Cuts a piece of text into plain parts and hotspot parts, so hotspots can be made clickable.
function split(text: string, hotspots: Hotspot[]) {
  const parts: { text: string; hotspot?: number }[] = []
  let rest = text
  while (rest) {
    let next: { at: number; i: number } | null = null
    hotspots.forEach((h, i) => {
      const at = h.text ? rest.indexOf(h.text) : -1
      if (at !== -1 && (next === null || at < next.at)) next = { at, i }
    })
    if (!next) {
      parts.push({ text: rest })
      break
    }
    const { at, i } = next
    if (at > 0) parts.push({ text: rest.slice(0, at) })
    parts.push({ text: hotspots[i].text, hotspot: i })
    rest = rest.slice(at + hotspots[i].text.length)
  }
  return parts
}

export function RedFlagsEmail({ email }: { email: Email }) {
  const hotspots = email.hotspots ?? []
  const [found, setFound] = useState<number[]>([])

  const render = (text?: string | null) =>
    split(text ?? '', hotspots).map((part, k) =>
      part.hotspot === undefined ? (
        <span key={k}>{part.text}</span>
      ) : (
        <button
          key={k}
          type="button"
          onClick={() => setFound((f) => (f.includes(part.hotspot!) ? f : [...f, part.hotspot!]))}
          // Looks like normal text until found, otherwise the game gives itself away.
          className={found.includes(part.hotspot) ? 'rounded bg-red-200 px-1 underline decoration-red-600' : 'cursor-text'}
        >
          {part.text}
        </button>
      ),
    )

  return (
    <>
      <div className="rounded-lg border border-neutral-300 p-6">
        <p><strong>From:</strong> {render(email.fromName)} &lt;{render(email.fromAddress)}&gt;</p>
        <p className="mb-4"><strong>Subject:</strong> {render(email.subject)}</p>
        <p className="whitespace-pre-line">{render(email.body)}</p>
      </div>

      <p className="mt-6 font-semibold">
        Found {found.length} of {hotspots.length} red flags
      </p>
      <ul className="mt-2 space-y-2">
        {found.map((i) => (
          <li key={i}>
            <strong>{hotspots[i].text}:</strong> {hotspots[i].reason}
          </li>
        ))}
      </ul>
    </>
  )
}