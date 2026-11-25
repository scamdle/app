import { describe, expect, it } from 'vitest'

import { scenarioProblems } from './scenarioValidate'

const paths = (data: Record<string, unknown>) => scenarioProblems(data).map((p) => p.path)
const next = [
  { text: 'Call the bank', isCorrect: true, explanation: 'x' },
  { text: 'Click the link', isCorrect: false, explanation: 'y' },
]
const email = { fromName: 'Bank', fromAddress: 'a@b.test', subject: 'Urgent', body: 'Pay within 24 hours' }
const base = {
  description: 'd',
  medium: 'email',
  email,
  wants: ['pay'],
  wantsExplanation: 'It asks her to pay.',
  verdictReason: 'r',
  flags: [{ text: 'within 24 hours', reason: 'pressure' }],
  nextPrompt: 'What next?',
  nextOptions: next,
}

describe('scenarioProblems', () => {
  it('accepts a complete scam email', () => {
    expect(paths(base)).toEqual([])
  })

  it('needs what the scam wants and why', () => {
    expect(paths({ ...base, wants: [], wantsExplanation: '' })).toEqual(['wants', 'wantsExplanation'])
  })

  it('needs red flags from the text', () => {
    expect(paths({ ...base, flags: [] })).toEqual(['flags'])
    expect(paths({ ...base, flags: [{ text: 'tomorrow', reason: 'r' }] })).toEqual(['flags.0.text'])
  })

  it('needs a correct next step', () => {
    expect(paths({ ...base, nextOptions: [{ ...next[0], isCorrect: false }, next[1]] })).toEqual(['nextOptions'])
  })

  const ad = {
    ...base,
    medium: 'ad',
    email: undefined,
    ad: { pageName: 'Shoe Deals', text: 'Sale', displayUrl: 'SHOE-DEALS.NET', buttonText: 'Shop now' },
    landing: { url: 'shoe-deals.net', headline: 'Only 2 left!' },
    flags: [
      { text: 'Only 2 left', reason: 'pressure' },
      { text: 'Sponsored', reason: 'anyone can pay for an ad' },
    ],
  }

  it('lets flags sit on the landing page or the Sponsored label of an ad', () => {
    expect(paths(ad)).toEqual([])
    expect(paths({ ...ad, landing: {} })).toEqual(['landing.url', 'landing.headline', 'flags.0.text'])
  })

  it('needs a red flag in the reviews when there are reviews to check', () => {
    const check = { site: 'shoe-deals.net', rating: '1.4 out of 5', reviews: [{ text: 'My boots never arrived.' }] }
    expect(paths({ ...ad, check })).toEqual(['check'])
    expect(paths({ ...ad, check, flags: [...ad.flags, { text: 'never arrived', reason: 'others lost money' }] })).toEqual([])
  })
})
