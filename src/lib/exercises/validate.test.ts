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
    expect(paths({ description: 'd', format: 'real-or-fake', medium: 'email' })).toEqual(['medium'])
    expect(paths({ description: 'd', format: 'what-next', medium: 'link' })).toEqual(['medium'])
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

  it('requires a verdict and reason in real or fake', () => {
    const base = { description: 'd', format: 'real-or-fake', medium: 'link', link: { url: 'https://x.test' } }
    expect(paths({ ...base, verdict: 'fake', answerReason: 'r' })).toEqual([])
    expect(paths({ ...base, answerReason: 'r' })).toEqual(['verdict'])
  })
})
