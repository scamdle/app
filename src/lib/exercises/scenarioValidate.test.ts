import { describe, expect, it } from 'vitest'

import { scenarioProblems } from './scenarioValidate'

const paths = (data: Record<string, unknown>) => scenarioProblems(data).map((p) => p.path)
const next = [
  { text: 'Call the bank', isCorrect: true, explanation: 'x' },
  { text: 'Click the link', isCorrect: false, explanation: 'y' },
]
const email = { fromName: 'Bank', fromAddress: 'a@b.test', subject: 'Urgent', body: 'Pay within 24 hours' }
const base = { description: 'd', medium: 'email', email, verdictReason: 'r', nextPrompt: 'What next?', nextOptions: next }

describe('scenarioProblems', () => {
  it('accepts a complete fake email', () => {
    expect(paths({ ...base, verdict: 'fake', flags: [{ text: 'within 24 hours', reason: 'pressure' }] })).toEqual([])
  })

  it('needs red flags from the text for fakes', () => {
    expect(paths({ ...base, verdict: 'fake', flags: [] })).toEqual(['flags'])
    expect(paths({ ...base, verdict: 'fake', flags: [{ text: 'tomorrow', reason: 'r' }] })).toEqual(['flags.0.text'])
  })

  it('needs a correct reason for real ones', () => {
    const whyReal = [
      { text: 'Known sender', isCorrect: false, explanation: 'x' },
      { text: 'No link', isCorrect: false, explanation: 'y' },
    ]
    expect(paths({ ...base, verdict: 'real', whyReal })).toEqual(['whyReal'])
    expect(paths({ ...base, verdict: 'real', whyReal: [{ ...whyReal[0], isCorrect: true }, whyReal[1]] })).toEqual([])
  })

  it('needs a verdict and a correct next step', () => {
    expect(paths({ ...base, nextOptions: [{ ...next[0], isCorrect: false }, next[1]] })).toEqual(['verdict', 'nextOptions'])
  })

  it('lets flags sit on the landing page or the Sponsored label of an ad', () => {
    const ad = {
      ...base,
      medium: 'ad',
      email: undefined,
      ad: { pageName: 'Shoe Deals', text: 'Sale', displayUrl: 'SHOE-DEALS.NET', buttonText: 'Shop now' },
      landing: { url: 'shoe-deals.net', headline: 'Only 2 left!' },
      verdict: 'fake',
      flags: [
        { text: 'Only 2 left', reason: 'pressure' },
        { text: 'Sponsored', reason: 'anyone can pay for an ad' },
      ],
    }
    expect(paths(ad)).toEqual([])
    expect(paths({ ...ad, landing: {} })).toEqual(['landing.url', 'landing.headline', 'flags.0.text'])
  })
})
