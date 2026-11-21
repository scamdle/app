import { tokenize } from './tokenize'
import type { Stars } from './types'

export type Guess = { segment: string; token: number }
export type TokenMark = Guess & { state: 'found' | 'wrong' | 'missed' }

export type TextFlagsScore = {
  found: number[]
  missed: number[]
  wrong: string[]
  marks: TokenMark[]
  finished: boolean
  stars: Stars
}

export function textFlagStars(found: number, total: number, wrong: number): Stars {
  if (found === 0) return 0
  if (found < total) return 1
  return wrong === 0 ? 3 : 2
}

// Replays every guess so the server needs no session: the client just resends the list.
export function scoreTextFlags(args: {
  segments: Record<string, string>
  flags: string[]
  guesses: Guess[]
  maxWrong: number
  giveUp?: boolean
}): TextFlagsScore {
  const { segments, flags, guesses, maxWrong, giveUp = false } = args
  const tokens = Object.fromEntries(
    Object.entries(segments).map(([id, text]) => [id, tokenize(text).filter((t) => t.index !== null)]),
  )

  const flagTokens = flags.map((flag) => {
    const hits: Guess[] = []
    if (!flag) return hits
    for (const [segment, text] of Object.entries(segments)) {
      let at = text.indexOf(flag)
      while (at !== -1) {
        const end = at + flag.length
        for (const token of tokens[segment]) {
          if (token.start < end && token.end > at) hits.push({ segment, token: token.index! })
        }
        at = text.indexOf(flag, at + 1)
      }
    }
    return hits
  })

  const same = (a: Guess, b: Guess) => a.segment === b.segment && a.token === b.token
  const found = new Set<number>()
  const wrong: Guess[] = []
  const seen: Guess[] = []
  const isDone = () => found.size === flags.length || wrong.length >= maxWrong

  for (const guess of guesses) {
    if (isDone()) break
    const token = tokens[guess.segment]?.[guess.token]
    if (!token || seen.some((g) => same(g, guess))) continue
    seen.push(guess)
    // One tap can find several flags when they share a sentence.
    const hit = flagTokens.flatMap((hits, i) => (hits.some((h) => same(h, guess)) ? [i] : []))
    if (hit.length === 0) wrong.push(guess)
    else hit.forEach((i) => found.add(i))
  }

  const finished = giveUp || isDone()
  const missed = flags.map((_, i) => i).filter((i) => !found.has(i))
  // Each piece gets one mark. A piece holding a found and a missed flag shows as found.
  const marks: TokenMark[] = []
  const mark = (h: Guess, state: TokenMark['state']) => {
    if (!marks.some((m) => same(m, h))) marks.push({ ...h, state })
  }
  for (const i of found) flagTokens[i].forEach((h) => mark(h, 'found'))
  wrong.forEach((g) => mark(g, 'wrong'))
  if (finished) missed.forEach((i) => flagTokens[i].forEach((h) => mark(h, 'missed')))

  return {
    found: [...found],
    missed,
    wrong: wrong.map((g) => tokens[g.segment][g.token].text),
    marks,
    finished,
    stars: textFlagStars(found.size, flags.length, wrong.length),
  }
}
