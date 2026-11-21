import { describe, expect, it } from 'vitest'

import { DEFAULT_AGE_GROUPS, DEFAULT_QUESTIONS, feedbackProblem, type FeedbackInput } from './feedback'

const form = { required: true, ageGroups: DEFAULT_AGE_GROUPS, questions: DEFAULT_QUESTIONS }
const answers = Object.fromEntries(DEFAULT_QUESTIONS.filter((q) => q.type === 'scale').map((q) => [q.key, 3]))
const valid: FeedbackInput = {
  deviceId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  day: '2026-11-21',
  scenarioId: 3,
  ageGroup: '65-74',
  answers,
  comment: '',
}

describe('feedbackProblem', () => {
  it('accepts a complete answer set', () => {
    expect(feedbackProblem(valid, form)).toBeNull()
  })

  it('rejects out-of-range, unknown and missing answers', () => {
    expect(feedbackProblem({ ...valid, answers: { ...answers, confidence: 9 } }, form)).toMatch(/confidence/)
    expect(feedbackProblem({ ...valid, answers: { ...answers, hacked: 1 } }, form)).toMatch(/Unknown question/)
    const { confidence: _, ...missing } = answers
    expect(feedbackProblem({ ...valid, answers: missing }, form)).toMatch(/confidence/)
  })

  it('rejects an unknown age group, a bad device id and a long comment', () => {
    expect(feedbackProblem({ ...valid, ageGroup: '120+' }, form)).toMatch(/age group/)
    expect(feedbackProblem({ ...valid, deviceId: 'me' }, form)).toMatch(/device/)
    expect(feedbackProblem({ ...valid, comment: 'x'.repeat(1001) }, form)).toMatch(/too long/)
  })
})
