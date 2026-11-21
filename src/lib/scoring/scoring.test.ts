import { describe, expect, it } from 'vitest'

import { optionStars, verdictStars } from './choices'
import { scoreTextFlags, textFlagStars } from './textFlags'
import { tokenize } from './tokenize'

const tappable = (text: string) => tokenize(text).filter((t) => t.index !== null).map((t) => t.text)

describe('tokenize', () => {
  it('splits sentences into words and keeps every character', () => {
    const text = 'Pay 1,99 € now!'
    expect(tappable(text)).toEqual(['Pay', '1', '99', '€', 'now'])
    expect(tokenize(text).map((t) => t.text).join('')).toBe(text)
  })

  it('splits links into parts', () => {
    expect(tappable('https://lhv-ee.secure-login.com/a?b=1')).toEqual([
      'https', 'lhv', 'ee', 'secure', 'login', 'com', 'a', 'b', '1',
    ])
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
  const segments = { body: 'Act within 24 hours at evil.example now' }
  const flags = ['within 24 hours', 'evil.example']
  const words = tappable(segments.body)
  const at = (word: string) => ({ segment: 'body', token: words.indexOf(word) })

  it('finds the whole flag from any word in it', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('24')], maxWrong: 3 })
    expect(score.found).toEqual([0])
    expect(score.finished).toBe(false)
    expect(score.marks.filter((m) => m.state === 'found')).toHaveLength(3)
  })

  it('does not reveal missed flags until finished', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('24')], maxWrong: 3 })
    expect(score.marks.some((m) => m.state === 'missed')).toBe(false)
  })

  it('finishes with 3 stars when every flag is found with no mistakes', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('within'), at('evil')], maxWrong: 3 })
    expect(score).toMatchObject({ finished: true, stars: 3 })
  })

  it('does not charge for tapping the same wrong word twice', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('Act'), at('Act')], maxWrong: 3 })
    expect(score.wrong).toEqual(['Act'])
  })

  it('ends at the wrong guess limit and ignores later guesses', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('Act'), at('at'), at('within')], maxWrong: 2 })
    expect(score).toMatchObject({ finished: true, stars: 0, found: [] })
    expect(score.marks.some((m) => m.state === 'missed')).toBe(true)
  })

  it('finishes early when the player gives up', () => {
    const score = scoreTextFlags({ segments, flags, guesses: [at('evil')], maxWrong: 3, giveUp: true })
    expect(score).toMatchObject({ finished: true, stars: 1, missed: [0] })
  })

  it('ignores token numbers that do not exist', () => {
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
