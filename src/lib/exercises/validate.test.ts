import { describe, expect, it } from 'vitest'

import { exerciseProblems } from './validate'

const paths = (data: Record<string, unknown>) => exerciseProblems(data).map((p) => p.path)
const email = { fromName: 'a', fromAddress: 'b', subject: 'Urgent', body: 'Pay within 24 hours' }

describe('exerciseProblems', () => {
  it('accepts a complete red-flags email', () => {
    expect(
      paths({
        description: 'd',
        format: 'spot-red-flags',
        medium: 'email',
        email,
        flags: [{ text: 'within 24 hours', reason: 'pressure' }],
      }),
    ).toEqual([])
  })

  it('rejects a flag that is not in the message', () => {
    expect(
      paths({
        description: 'd',
        format: 'spot-red-flags',
        medium: 'email',
        email,
        flags: [{ text: 'within 48 hours', reason: 'pressure' }],
      }),
    ).toEqual(['flags.0.text'])
  })

  it('rejects a format and medium that do not go together', () => {
    expect(paths({ description: 'd', format: 'side-by-side', medium: 'email' })).toEqual(['medium'])
    expect(paths({ description: 'd', format: 'what-next', medium: 'video' })).toEqual(['medium'])
  })

  it('requires dots with reasons on image flags', () => {
    const base = { description: 'd', format: 'spot-red-flags', medium: 'image', image: 1 }
    expect(paths({ ...base, dots: [] })).toEqual(['dots'])
    expect(paths({ ...base, dots: [{ x: 1, y: 1, size: 'small', reason: '' }] })).toEqual(['dots'])
    expect(paths({ ...base, dots: [{ x: 1, y: 1, size: 'small', reason: 'r' }] })).toEqual([])
  })

  it('only allows SMS in what next', () => {
    const data = {
      description: 'd',
      format: 'what-next',
      medium: 'message',
      message: { platform: 'whatsapp', sender: 's', bubbles: [{ text: 'hi' }] },
      scenario: 's',
      options: [
        { text: 'a', isCorrect: true, explanation: 'x' },
        { text: 'b', isCorrect: false, explanation: 'y' },
      ],
    }
    expect(paths(data)).toEqual(['message.platform'])
  })

  it('requires a correct option in what next', () => {
    const data = {
      description: 'd',
      format: 'what-next',
      medium: 'email',
      email,
      scenario: 's',
      options: [
        { text: 'a', isCorrect: false, explanation: 'x' },
        { text: 'b', isCorrect: false, explanation: 'y' },
      ],
    }
    expect(paths(data)).toEqual(['options'])
  })

  it('requires a verdict and https video in real or fake', () => {
    const base = { description: 'd', format: 'real-or-fake', medium: 'video', answerReason: 'r' }
    expect(paths({ ...base, verdict: 'fake', videoUrl: 'http://x.test/a.mp4' })).toEqual(['videoUrl'])
    expect(paths({ ...base, verdict: 'fake', videoUrl: 'https://x.test/a.mp4' })).toEqual([])
    expect(paths({ ...base, videoUrl: 'https://x.test/a.mp4' })).toEqual(['verdict'])
  })

  it('requires both items in side by side', () => {
    const base = { description: 'd', format: 'side-by-side', medium: 'image', answerReason: 'r' }
    expect(paths({ ...base, comparison: { realImage: 1 } })).toEqual(['comparison.fakeImage'])
    expect(paths({ ...base, comparison: { realImage: 1, fakeImage: 2 } })).toEqual([])
  })
})
