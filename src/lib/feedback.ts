// The starter feedback form. Editors can change all of this in Game settings; these
// values are the defaults there and the fallback when the lists are left empty.
export type FeedbackQuestion = {
  key: string
  text: string
  type: 'scale' | 'comment'
  lowLabel?: string | null
  highLabel?: string | null
}
export type AgeGroup = { label: string; value: string }

export const DEFAULT_AGE_GROUPS: AgeGroup[] = [
  { label: 'Under 50', value: 'under-50' },
  { label: '50–64', value: '50-64' },
  { label: '65–74', value: '65-74' },
  { label: '75 or older', value: '75-plus' },
]

export const DEFAULT_QUESTIONS: FeedbackQuestion[] = [
  { key: 'confidence', text: 'How confident are you at spotting a scam?', type: 'scale', lowLabel: 'Not at all', highLabel: 'Very confident' },
  { key: 'know-what-to-do', text: 'If you got a suspicious message, would you know what to do?', type: 'scale', lowLabel: 'No idea', highLabel: 'Yes, for sure' },
  { key: 'difficulty', text: 'How easy was today’s scenario?', type: 'scale', lowLabel: 'Very hard', highLabel: 'Very easy' },
  { key: 'clear-instructions', text: 'Were the instructions clear?', type: 'scale', lowLabel: 'Not clear', highLabel: 'Very clear' },
  { key: 'readability', text: 'Was the text big enough and easy to read?', type: 'scale', lowLabel: 'Hard to read', highLabel: 'Easy to read' },
  { key: 'ease-of-use', text: 'Was the website easy to use?', type: 'scale', lowLabel: 'Very hard', highLabel: 'Very easy' },
  { key: 'comment', text: 'Anything else you’d like to tell us?', type: 'comment' },
]

export const SCALE = [1, 2, 3, 4, 5] as const
export const COMMENT_MAX = 1000

export type FeedbackForm = { required: boolean; ageGroups: AgeGroup[]; questions: FeedbackQuestion[] }

export type FeedbackInput = {
  deviceId: string
  day: string
  scenarioId: number
  ageGroup: string
  answers: Record<string, number>
  comment: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Checks a submission against the current form. Returns an error message, or null if it's fine.
export function feedbackProblem(input: FeedbackInput, form: FeedbackForm): string | null {
  if (!input || typeof input !== 'object') return 'Invalid feedback'
  if (typeof input.deviceId !== 'string' || !UUID.test(input.deviceId)) return 'Invalid device'
  if (typeof input.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return 'Invalid day'
  if (!Number.isSafeInteger(input.scenarioId) || input.scenarioId <= 0) return 'Invalid scenario'
  if (!form.ageGroups.some((group) => group.value === input.ageGroup)) return 'Choose an age group'
  if (typeof input.comment !== 'string' || input.comment.length > COMMENT_MAX) return 'Comment is too long'
  const answers = input.answers
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return 'Invalid answers'
  const scales = form.questions.filter((q) => q.type === 'scale')
  for (const key of Object.keys(answers)) {
    if (!scales.some((q) => q.key === key)) return `Unknown question: ${key}`
  }
  for (const question of scales) {
    if (!SCALE.includes(answers[question.key] as (typeof SCALE)[number])) return `Answer every question (${question.key})`
  }
  return null
}
