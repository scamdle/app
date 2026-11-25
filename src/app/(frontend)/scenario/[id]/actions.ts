'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { feedbackProblem, type FeedbackInput } from '@/lib/feedback'
import { loadScenario } from '@/lib/exercises/load'
import { SCENARIO_WANTS } from '@/lib/exercises/options'
import { flagInPart, partSegments, SCENARIO_PARTS, type ScenarioPart } from '@/lib/exercises/segments'
import { scenarioFlagSteps } from '@/lib/exercises/toPlayableScenario'
import type {
  ResultItem,
  ScenarioAnswers,
  ScenarioChoiceResponse,
  ScenarioGuessResponse,
  ScenarioStepResult,
  ScenarioSummary,
} from '@/lib/exercises/types'
import { choicePoints, flagPoints, scenarioPercent } from '@/lib/scoring/scenario'
import { scoreTextFlags, type Guess } from '@/lib/scoring/textFlags'
import { DEFAULT_REGION } from '@/lib/regions'
import { getGameSettings } from '@/lib/settings'
import type { Scenario } from '@/payload-types'

// These run on the server and anyone can call them, so inputs are checked and answers only
// leave once the step they belong to is answered. Nothing is saved: the client resends its inputs.

const LIMIT = 500

const isGuess = (g: unknown): g is Guess =>
  typeof g === 'object' && g !== null && typeof (g as Guess).segment === 'string' && Number.isInteger((g as Guess).token)
const isTicks = (t: unknown): t is number[] => Array.isArray(t) && t.length <= LIMIT && t.every(Number.isInteger)
const isGuesses = (g: unknown): g is Guess[] => Array.isArray(g) && g.length <= LIMIT && g.every(isGuess)

async function load(id: unknown): Promise<Scenario> {
  const scenario = await loadScenario(id)
  if (!scenario) throw new Error('Scenario not found')
  return scenario
}

const isPart = (p: unknown): p is ScenarioPart => SCENARIO_PARTS.includes(p as ScenarioPart)

// Red flags of one part: the message, ad or result itself, the page, or the reviews.
const partFlags = (s: Scenario, part: ScenarioPart) => (s.flags ?? []).filter((f) => flagInPart(s, f.text, part))

function flagStep(s: Scenario, part: ScenarioPart, guesses: Guess[], giveUp: boolean) {
  const flags = partFlags(s, part)
  const maxWrong = s.maxWrongGuesses ?? 3
  const score = scoreTextFlags({ segments: partSegments(s, part), flags: flags.map((f) => f.text), guesses, maxWrong, giveUp })
  const step: ScenarioStepResult = {
    points: flagPoints(score.found.length, flags.length, score.wrong.length),
    items: [
      ...score.found.map((i): ResultItem => ({ kind: 'good', label: flags[i].text, reason: flags[i].reason })),
      ...score.missed.map((i): ResultItem => ({ kind: 'missed', label: flags[i].text, reason: flags[i].reason })),
      ...score.wrong.map((word): ResultItem => ({ kind: 'bad', label: word, reason: null })),
    ],
  }
  return { score, step, flags, maxWrong }
}

type Option = { text: string; isCorrect?: boolean | null; explanation?: string | null }

// Step 1's fixed answers. The scenario says which ones fit, with one explanation for those.
const wantOptions = (s: Scenario): Option[] =>
  SCENARIO_WANTS.map((want) => {
    const isCorrect = (s.wants ?? []).includes(want.value)
    return { text: want.label, isCorrect, explanation: isCorrect ? (s.wantsExplanation ?? null) : null }
  })

function choiceStep(options: Option[], ticked: number[]) {
  const correct = options.map((option) => option.isCorrect === true)
  const step: ScenarioStepResult = {
    points: choicePoints(correct, ticked),
    items: options.map((option, i): ResultItem => {
      const wasTicked = ticked.includes(i)
      const label = option.text
      const reason = option.explanation ?? null
      if (correct[i]) return wasTicked ? { kind: 'good', word: 'Right to tick', label, reason } : { kind: 'missed', word: 'Should be ticked', label, reason }
      return wasTicked ? { kind: 'bad', word: 'Should not be ticked', label, reason } : { kind: 'good', word: 'Right to skip', label, reason }
    }),
  }
  return { correct, step }
}

// Red flags, one part at a time.
export async function guessScenarioFlags(id: number, part: ScenarioPart, guesses: Guess[], giveUp = false): Promise<ScenarioGuessResponse> {
  if (!isPart(part) || !isGuesses(guesses)) throw new Error('Invalid guesses')
  const s = await load(id)
  const { score, step, flags, maxWrong } = flagStep(s, part, guesses, giveUp === true)
  if (flags.length === 0) throw new Error('This part has no red flags')
  return {
    found: score.found.length,
    total: flags.length,
    wrong: score.wrong.length,
    maxWrong,
    marks: score.marks,
    step: score.finished ? step : null,
  }
}

// Step 1 ("what does it want?") and the last step ("what next?").
export async function answerScenarioChoices(id: number, which: 'wants' | 'next', ticked: number[]): Promise<ScenarioChoiceResponse> {
  if ((which !== 'wants' && which !== 'next') || !isTicks(ticked)) throw new Error('Invalid answer')
  const s = await load(id)
  return choiceStep(which === 'wants' ? wantOptions(s) : (s.nextOptions ?? []), ticked)
}

// Replays every answer, so the score is the server's own. A future "you beat X% of
// players today" feature can save this number and trust it.
const STEP_NAMES: Record<ScenarioPart, string> = { content: 'Red flags', landing: 'The page', check: 'The reviews' }

async function score(s: Scenario, answers: ScenarioAnswers): Promise<ScenarioSummary> {
  const first = s.medium === 'search' ? 'The search result' : s.medium === 'ad' ? 'The ad' : STEP_NAMES.content
  const steps = [
    ...(s.wants?.length ? [{ name: 'What it wants', points: choiceStep(wantOptions(s), answers.wantsTicked).step.points }] : []),
    ...scenarioFlagSteps(s).map(({ part }) => ({
      name: part === 'content' ? first : STEP_NAMES[part],
      points: flagStep(s, part, answers.guesses[part], true).step.points,
    })),
    { name: 'What to do next', points: choiceStep(s.nextOptions ?? [], answers.nextTicked).step.points },
  ]
  return {
    percent: scenarioPercent(steps.map((step) => step.points)),
    steps,
    verdictReason: s.verdictReason ?? null,
    explanation: s.explanation ?? null,
  }
}

const isAnswers = (a: unknown): a is ScenarioAnswers => {
  const x = a as ScenarioAnswers
  return (
    typeof x === 'object' &&
    x !== null &&
    isTicks(x.wantsTicked) &&
    typeof x.guesses === 'object' &&
    x.guesses !== null &&
    SCENARIO_PARTS.every((part) => isGuesses(x.guesses[part])) &&
    isTicks(x.nextTicked)
  )
}

export async function finishScenario(id: number, answers: ScenarioAnswers): Promise<ScenarioSummary> {
  if (!isAnswers(answers)) throw new Error('Invalid answers')
  return score(await load(id), answers)
}

export type FeedbackResult = { ok: true } | { ok: false; error: string }

// Anonymous feedback after the scenario. One per device per day; the score is recomputed here.
export async function submitFeedback(input: FeedbackInput, answers: ScenarioAnswers): Promise<FeedbackResult> {
  const { feedback: form } = await getGameSettings()
  if (!form) return { ok: false, error: 'The feedback form is turned off.' }
  const problem = feedbackProblem(input, form)
  if (problem) return { ok: false, error: problem }
  if (!isAnswers(answers)) return { ok: false, error: 'Invalid answers' }

  const s = await loadScenario(input.scenarioId)
  if (!s || s.status !== 'published') return { ok: false, error: 'Scenario not found' }
  const { percent } = await score(s, answers)

  const payload = await getPayload({ config })
  const existing = await payload.count({
    collection: 'feedback',
    where: { deviceId: { equals: input.deviceId }, day: { equals: input.day } },
  })
  if (existing.totalDocs > 0) return { ok: false, error: 'You already sent feedback today. Thank you!' }

  const comment = input.comment.trim()
  try {
    await payload.create({
      collection: 'feedback',
      data: {
        day: input.day,
        region: DEFAULT_REGION,
        scenario: s.id,
        percent,
        ageGroup: input.ageGroup,
        answers: input.answers,
        comment: comment || null,
        deviceId: input.deviceId,
      },
    })
  } catch {
    // Most likely two taps at once: the unique index lets only one through.
    return { ok: false, error: 'You already sent feedback today. Thank you!' }
  }
  return { ok: true }
}

