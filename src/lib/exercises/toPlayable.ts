import type { Exercise } from '@/payload-types'

import type { Platform } from './options'
import type { Playable, PlayableEmail, PlayableLink, PlayableMessage } from './types'

type WithEmail = { email?: Exercise['email'] }
type WithMessage = { message?: Exercise['message'] }

export const toEmail = (e: WithEmail): PlayableEmail => ({
  kind: 'email',
  fromName: e.email?.fromName ?? '',
  fromAddress: e.email?.fromAddress ?? '',
  subject: e.email?.subject ?? '',
  body: e.email?.body ?? '',
})

export const toMessage = (e: WithMessage): PlayableMessage => ({
  kind: 'message',
  platform: (e.message?.platform ?? 'sms') as Platform,
  sender: e.message?.sender ?? '',
  bubbles: (e.message?.bubbles ?? []).map((bubble) => bubble.text),
})

const toLink = (e: Exercise): PlayableLink => ({
  kind: 'link',
  context: e.link?.context ?? null,
  url: e.link?.url ?? '',
})

// The only way exercise data reaches the browser before an answer, so answers can't leak.
// Returns null when the exercise can't be played, e.g. an unfinished draft.
export function toPlayable(e: Exercise): Playable | null {
  const base = { id: e.id, title: e.title, description: e.description ?? '' }

  if (e.format === 'spot-red-flags') {
    const flagCount = e.flags?.length ?? 0
    if (flagCount === 0) return null
    const maxWrong = e.maxWrongGuesses ?? 3
    if (e.medium === 'email') return { ...base, format: 'spot-text', content: toEmail(e), flagCount, maxWrong }
    if (e.medium === 'message') return { ...base, format: 'spot-text', content: toMessage(e), flagCount, maxWrong }
    if (e.medium === 'link') return { ...base, format: 'spot-text', content: toLink(e), flagCount, maxWrong }
    return null
  }

  if (e.format === 'real-or-fake') {
    return e.medium === 'link' ? { ...base, format: 'real-or-fake', content: toLink(e) } : null
  }

  if (e.format === 'what-next') {
    const options = (e.options ?? []).map((option) => option.text)
    if (options.length === 0) return null
    const scenario = e.scenario ?? ''
    if (e.medium === 'email') return { ...base, format: 'what-next', content: toEmail(e), scenario, options }
    if (e.medium === 'message') return { ...base, format: 'what-next', content: toMessage(e), scenario, options }
  }

  return null
}
