import { describe, expect, it } from 'vitest'

import type { Scenario } from '@/payload-types'

import { scenarioFlagSteps } from './toPlayableScenario'

const shop = {
  medium: 'ad',
  ad: { pageName: 'Shoes', text: 'All boots -80%', displayUrl: 'shoes.shop', buttonText: 'Shop now' },
  landing: { url: 'shoes.shop', headline: '-80% on everything', body: 'Only 2 left' },
  check: { rating: '1.4 out of 5', reviews: [{ text: 'Never arrived' }] },
  flags: [
    { text: '-80%', reason: 'r' },
    { text: 'Only 2 left', reason: 'r' },
    { text: 'Never arrived', reason: 'r' },
  ],
} as unknown as Scenario

const counts = (s: Scenario) => scenarioFlagSteps(s).map((step) => [step.part, step.flagCount])

describe('scenarioFlagSteps', () => {
  it('asks a flag in every part where its text appears', () => {
    expect(counts(shop)).toEqual([['content', 1], ['landing', 2], ['check', 1]])
  })

  it('skips a part without flags, such as a fake page that looks fine', () => {
    const clean = { ...shop, landing: { url: 'shoes.shop', headline: 'Winter boots' }, flags: [shop.flags![0], shop.flags![2]] } as Scenario
    expect(counts(clean)).toEqual([['content', 1], ['check', 1]])
  })
})
