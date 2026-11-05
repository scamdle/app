import { describe, expect, it } from 'vitest'

import { toVideo } from './video'

describe('toVideo', () => {
  it('uses the embed player for YouTube and Vimeo', () => {
    const embed = (src: string) => ({ kind: 'embed', src })
    expect(toVideo('https://www.youtube.com/watch?v=abc_1-2')).toEqual(embed('https://www.youtube-nocookie.com/embed/abc_1-2'))
    expect(toVideo('https://youtu.be/abc')).toEqual(embed('https://www.youtube-nocookie.com/embed/abc'))
    expect(toVideo('https://vimeo.com/123')).toEqual(embed('https://player.vimeo.com/video/123'))
  })

  it('plays other https links as files and refuses the rest', () => {
    expect(toVideo('https://x.test/a.mp4')).toEqual({ kind: 'file', src: 'https://x.test/a.mp4' })
    expect(toVideo('http://x.test/a.mp4')).toBeNull()
    expect(toVideo('javascript:alert(1)')).toBeNull()
    expect(toVideo('not a url')).toBeNull()
  })
})
