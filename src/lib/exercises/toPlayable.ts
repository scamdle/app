import { createHmac } from 'crypto'

import type { Exercise, Media } from '@/payload-types'

import type { Platform } from './options'
import type { Playable, PlayableEmail, PlayableImage, PlayableLink, PlayableMessage, SideItem } from './types'
import { toVideo } from './video'

const toImage = (media: Exercise['image'], alt?: string): PlayableImage | null => {
  if (!media || typeof media === 'number' || !media.url) return null
  const doc: Media = media
  return { url: doc.url!, width: doc.width ?? 1200, height: doc.height ?? 800, alt: alt ?? doc.alt }
}

const toEmail = (e: Exercise): PlayableEmail => ({
  kind: 'email',
  fromName: e.email?.fromName ?? '',
  fromAddress: e.email?.fromAddress ?? '',
  subject: e.email?.subject ?? '',
  body: e.email?.body ?? '',
})

const toMessage = (e: Exercise): PlayableMessage => ({
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

// A stable coin flip per exercise, so the real item isn't always on the same side.
// Keyed with the secret so the side can't be worked out from the id in the URL.
export function realIsLeft(id: number): boolean {
  const digest = createHmac('sha256', process.env.PAYLOAD_SECRET ?? '').update(String(id)).digest()
  return digest[0] % 2 === 0
}

// The only way exercise data reaches the browser before an answer, so answers can't leak.
// Returns null when the exercise can't be played, e.g. an unfinished draft.
export function toPlayable(e: Exercise): Playable | null {
  const base = { id: e.id, title: e.title, description: e.description ?? '' }

  if (e.format === 'spot-red-flags' && e.medium === 'image') {
    const image = toImage(e.image)
    const dots = Array.isArray(e.dots) ? e.dots : []
    return image && dots.length ? { ...base, format: 'spot-image', image, dotCount: dots.length } : null
  }

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
    if (e.medium === 'link') return { ...base, format: 'real-or-fake', content: toLink(e) }
    if (e.medium === 'image') {
      const image = toImage(e.image)
      return image ? { ...base, format: 'real-or-fake', content: { kind: 'image', image } } : null
    }
    if (e.medium === 'video') {
      const video = toVideo(e.videoUrl ?? '')
      return video ? { ...base, format: 'real-or-fake', content: { kind: 'video', video } } : null
    }
    return null
  }

  if (e.format === 'side-by-side') {
    const item = (image: Exercise['image'], url: string | null | undefined, name: string): SideItem | null => {
      if (e.medium === 'image') {
        // A neutral alt text: the editor's own could give the answer away.
        const playable = toImage(image, `Image ${name}`)
        return playable && { image: playable }
      }
      const video = toVideo(url ?? '')
      return video && { video }
    }
    const left = realIsLeft(e.id)
    const real = item(e.comparison?.realImage, e.comparison?.realVideoUrl, left ? 'A' : 'B')
    const fake = item(e.comparison?.fakeImage, e.comparison?.fakeVideoUrl, left ? 'B' : 'A')
    if (!real || !fake) return null
    return { ...base, format: 'side-by-side', left: left ? real : fake, right: left ? fake : real }
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
