'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { feedbackProblem, type FeedbackInput } from '@/lib/feedback'
import { loadScenario } from '@/lib/exercises/load'
import { textSegments } from '@/lib/exercises/segments'
import type {
  ResultItem,
  ScenarioAnswers,
  ScenarioChoiceResponse,
  ScenarioGuessResponse,
  ScenarioStepResult,
  ScenarioSummary,
  ScenarioVerdictResponse,
  Verdict,
} from '@/lib/exercises/types'
import { choicePoints, flagPoints, scenarioPercent, verdictPoints } from '@/lib/scoring/scenario'
import { scoreTextFlags, type Guess } from '@/lib/scoring/textFlags'
import { DEFAULT_REGION } from '@/lib/regions'
import { getGameSettings } from '@/lib/settings'
import type { Scenario } from '@/payload-types'

// These run on the server and anyone can call them, so inputs are checked and answers only
// leave once the step they belong to is answered. Nothing is saved: the client resends its inputs.

const LIMIT = 500

const isVerdict = (v: unknown): v is Verdict => v === 'real' || v === 'fake'
const isGuess = (g: unknown): g is Guess =>
  typeof g === 'object' && g !== null && typeof (g as Guess).segment === 'string' && Number.isInteger((g as Guess).token)
const isTicks = (t: unknown): t is number[] => Array.isArray(t) && t.length <= LIMIT && t.every(Number.isInteger)
const isGuesses = (g: unknown): g is Guess[] => Array.isArray(g) && g.length <= LIMIT && g.every(isGuess)

async function load(id: unknown): Promise<Scenario> {
  const scenario = await loadScenario(id)
  if (!scenario || !isVerdict(scenario.verdict)) throw new Error('Scenario not found')
  return scenario
}

function flagStep(s: Scenario, guesses: Guess[], giveUp: boolean) {
  const flags = s.flags ?? []
  const maxWrong = s.maxWrongGuesses ?? 3
  const score = scoreTextFlags({ segments: textSegments(s), flags: flags.map((f) => f.text), guesses, maxWrong, giveUp })
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

function choiceStep(options: NonNullable<Scenario['nextOptions']>, ticked: number[]) {
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

// Step 1. Only says what it was: the reason waits for the summary, so steps 2 and 3 aren't spoiled.
export async function answerScenarioVerdict(id: number, answer: Verdict): Promise<ScenarioVerdictResponse> {
  if (!isVerdict(answer)) throw new Error('Invalid answer')
  const s = await load(id)
  const verdict = s.verdict as Verdict
  return {
    correct: verdict === answer,
    verdict,
    step2:
      verdict === 'fake'
        ? { kind: 'flags', flagCount: s.flags?.length ?? 0, maxWrong: s.maxWrongGuesses ?? 3 }
        : { kind: 'why', options: (s.whyReal ?? []).map((option) => option.text) },
  }
}

// Step 2 for fakes.
export async function guessScenarioFlags(id: number, guesses: Guess[], giveUp = false): Promise<ScenarioGuessResponse> {
  if (!isGuesses(guesses)) throw new Error('Invalid guesses')
  const s = await load(id)
  if (s.verdict !== 'fake') throw new Error('This scenario has no red flags')
  const { score, step, flags, maxWrong } = flagStep(s, guesses, giveUp === true)
  return {
    found: score.found.length,
    total: flags.length,
    wrong: score.wrong.length,
    maxWrong,
    marks: score.marks,
    step: score.finished ? step : null,
  }
}

// Step 2 for real ones ("why is this real?") and step 3 ("what next?").
export async function answerScenarioChoices(id: number, which: 'why' | 'next', ticked: number[]): Promise<ScenarioChoiceResponse> {
  if ((which !== 'why' && which !== 'next') || !isTicks(ticked)) throw new Error('Invalid answer')
  const s = await load(id)
  if (which === 'why' && s.verdict !== 'real') throw new Error('This scenario has no reasons to choose')
  return choiceStep((which === 'why' ? s.whyReal : s.nextOptions) ?? [], ticked)
}

// Replays every answer, so the score is the server's own. A future "you beat X% of
// players today" feature can save this number and trust it.
async function score(s: Scenario, answers: ScenarioAnswers): Promise<ScenarioSummary> {
  const verdict = s.verdict as Verdict
  const step1 = verdictPoints(answers.verdict === verdict)
  const step2 = verdict === 'fake' ? flagStep(s, answers.guesses, true).step.points : choiceStep(s.whyReal ?? [], answers.whyTicked).step.points
  const step3 = choiceStep(s.nextOptions ?? [], answers.nextTicked).step.points
  return {
    percent: scenarioPercent([step1, step2, step3]),
    steps: [step1, step2, step3],
    verdict,
    verdictReason: s.verdictReason ?? null,
    explanation: s.explanation ?? null,
  }
}

const isAnswers = (a: unknown): a is ScenarioAnswers => {
  const x = a as ScenarioAnswers
  return typeof x === 'object' && x !== null && isVerdict(x.verdict) && isGuesses(x.guesses) && isTicks(x.whyTicked) && isTicks(x.nextTicked)
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
  if (!s || s.status !== 'published' || !isVerdict(s.verdict)) return { ok: false, error: 'Scenario not found' }
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

