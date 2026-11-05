import type { PlayableVideo } from './types'

// YouTube and Vimeo need their embed player; anything else plays as a plain video file.
export function toVideo(value: string): PlayableVideo | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be' ? url.pathname.slice(1) : (url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1])
    return id && /^[\w-]+$/.test(id) ? { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.match(/^\/(\d+)/)?.[1]
    return id ? { kind: 'embed', src: `https://player.vimeo.com/video/${id}` } : null
  }
  return { kind: 'file', src: url.href }
}
