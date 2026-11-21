import { describe, expect, it } from 'vitest'

import { optionStars, verdictStars } from './choices'
import { scoreTextFlags, textFlagStars } from './textFlags'
import { tokenize } from './tokenize'

const tappable = (text: string) => tokenize(text).filter((t) => t.index !== null).map((t) => t.text)

describe('tokenize', () => {
  it('splits text into sentences and keeps every character', () => {
    const text = 'Your parcel is held. Pay 1.99 € now!\nThanks'
    expect(tappable(text)).toEqual(['Your parcel is held.', 'Pay 1.99 € now!', 'Thanks'])
    expect(tokenize(text).map((t) => t.text).join('')).toBe(text)
  })

  it('keeps web and email addresses as their own piece, without trailing punctuation', () => {
    expect(tappable('Pay the fee today: http://parcel-fee.example/pay.')).toEqual([
      'Pay the fee today:',
      'http://parcel-fee.example/pay',
    ])
    expect(tappable('Write to security@lumobank-veilig.com or visit lumobank.com.secure-login.net/verify now')).toEqual([
      'Write to',
      'security@lumobank-veilig.com',
      'or visit',
      'lumobank.com.secure-login.net/verify',
      'now',
    ])
  })

  it('does not treat numbers, times or abbreviations as addresses', () => {
    expect(tappable('Boots 19,99 € or 1.99 €. Offer ends in 09:59')).toEqual(['Boots 19,99 € or 1.99 €.', 'Offer ends in 09:59'])
  })
})

describe('text flag stars', () => {
  it.each([
    [4, 4, 0, 3],
    [4, 4, 2, 2],
    [2, 4, 0, 1],
    [2, 4, 3, 1],
    [0, 4, 3, 0],
  ])('%i of %i flags with %i wrong gives %i stars', (found, total, wrong, stars) => {
    expect(textFlagStars(found, total, wrong)).toBe(stars)
  })
})

describe('scoreTextFlags', () => {
  const segments = { body: 'Dear customer. Act within 24 hours at evil.example now. Thanks!' }
  const flags = ['within 24 hours', 'evil.example', 'Dear customer']
  const pieces = tappable(segments.body)
  const at = (text: string) => ({ segment: 'body', token: pieces.indexOf(text) })

  it('splits the sample as expected', () => {
    expect(pieces).toEqual(['Dear customer.', 'Act within 24 hours at', 'evil.example', 'now.', 'Thanks!'])
  })

  it('finds a flag by tapping its sentence', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('Act within 24 hours at')], maxWrong: 3 })
    expect(score.found).toEqual([0])
    expect(score.finished).toBe(false)
    expect(score.marks).toEqual([{ ...at('Act within 24 hours at'), state: 'found' }])
  })

  it('finds every flag in a tapped sentence', () => {
    const shared = { body: 'Pay within 24 hours or lose access.' }
    const score = scoreTextFlags({ segments: shared, flags: ['within 24 hours', 'lose access'], guesses: [{ segment: 'body', token: 0 }], maxWrong: 3 })
    expect(score).toMatchObject({ found: [0, 1], finished: true, stars: 3 })
    expect(score.marks).toHaveLength(1)
  })

  it('does not reveal missed flags until finished', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('Dear customer.')], maxWrong: 3 })
    expect(score.marks.some((m) => m.state === 'missed')).toBe(false)
  })

  it('finishes with 3 stars when every flag is found with no mistakes', () => {
    const guesses = [at('Dear customer.'), at('Act within 24 hours at'), at('evil.example')]
    expect(scoreTextFlags({ segments, flags, guesses, maxWrong: 3 })).toMatchObject({ finished: true, stars: 3 })
  })

  it('does not charge for tapping the same wrong sentence twice', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('Thanks!'), at('Thanks!')], maxWrong: 3 })
    expect(score.wrong).toEqual(['Thanks!'])
  })

  it('ends at the wrong guess limit, ignores later guesses and shows what was missed', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('Thanks!'), at('now.'), at('evil.example')], maxWrong: 2 })
    expect(score).toMatchObject({ finished: true, stars: 0, found: [] })
    expect(score.marks.filter((m) => m.state === 'missed')).toHaveLength(3)
  })

  it('finishes early when the player gives up', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('evil.example')], maxWrong: 3, giveUp: true })
    expect(score).toMatchObject({ finished: true, stars: 1, missed: [0, 2] })
  })

  it('ignores piece numbers that do not exist', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [{ segment: 'nope', token: 0 }, { segment: 'body', token: 99 }], maxWrong: 3 })
    expect(score.wrong).toEqual([])
  })
})

describe('option stars', () => {
  const correct = [true, true, false, false]
  it.each([
    [[0, 1], 3],
    [[0], 2],
    [[0, 1, 2], 2],
    [[0, 2], 1],
    [[0, 2, 3], 1],
    [[2, 3], 0],
    [[], 0],
  ])('ticking %j gives %i stars', (ticked, stars) => {
    expect(optionStars(correct, ticked)).toBe(stars)
  })

  it('gives 0 when the only correct option is left unticked', () => {
    expect(optionStars([true, false], [])).toBe(0)
  })

  it('ignores option numbers that do not exist', () => {
    expect(optionStars([true, false], [0, 7])).toBe(3)
  })
})

describe('verdict stars', () => {
  it('is all or nothing', () => {
    expect(verdictStars(true)).toBe(3)
    expect(verdictStars(false)).toBe(0)
  })
})
