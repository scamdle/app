'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { feedbackProblem, type FeedbackInput } from '@/lib/feedback'
import { loadScenario } from '@/lib/exercises/load'
import { flagPart, partSegments, type ScenarioPart } from '@/lib/exercises/segments'
import type {
  ResultItem,
  ScenarioAnswers,
  ScenarioBackup,
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

const isPart = (p: unknown): p is ScenarioPart => p === 'content' || p === 'landing'
const hasPage = (s: Scenario) => s.medium === 'ad' || s.medium === 'search'

// Red flags of one part: the message, ad or result itself, or the page Anna lands on.
const partFlags = (s: Scenario, part: ScenarioPart) => (s.flags ?? []).filter((f) => flagPart(s, f.text) === part)

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

// The "back it up" steps, in order. Ads and search results get a second one for the page,
// skipped when it would be empty (no flags there, or no "why is the page real?" options).
function backups(s: Scenario): ScenarioBackup[] {
  const parts: ScenarioPart[] = hasPage(s) ? ['content', 'landing'] : ['content']
  return parts.flatMap((part): ScenarioBackup[] => {
    if (s.verdict === 'fake') {
      const flagCount = partFlags(s, part).length
      return flagCount > 0 ? [{ part, kind: 'flags', flagCount, maxWrong: s.maxWrongGuesses ?? 3 }] : []
    }
    const options = ((part === 'content' ? s.whyReal : s.pageWhyReal) ?? []).map((option) => option.text)
    return options.length > 0 ? [{ part, kind: 'why', options }] : []
  })
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

// Step 1. Only says what it was: the reason waits for the summary, so later steps aren't spoiled.
export async function answerScenarioVerdict(id: number, answer: Verdict): Promise<ScenarioVerdictResponse> {
  if (!isVerdict(answer)) throw new Error('Invalid answer')
  const s = await load(id)
  const verdict = s.verdict as Verdict
  return { correct: verdict === answer, verdict, backups: backups(s) }
}

// Red flags for fakes, one part at a time.
export async function guessScenarioFlags(id: number, part: ScenarioPart, guesses: Guess[], giveUp = false): Promise<ScenarioGuessResponse> {
  if (!isPart(part) || !isGuesses(guesses)) throw new Error('Invalid guesses')
  const s = await load(id)
  if (s.verdict !== 'fake') throw new Error('This scenario has no red flags')
  if (part === 'landing' && !hasPage(s)) throw new Error('This scenario has no page')
  const { score, step, flags, maxWrong } = flagStep(s, part, guesses, giveUp === true)
  return {
    found: score.found.length,
    total: flags.length,
    wrong: score.wrong.length,
    maxWrong,
    marks: score.marks,
    step: score.finished ? step : null,
  }
}

type ChoiceSet = 'why' | 'pageWhy' | 'next'

const choiceOptions = (s: Scenario, which: ChoiceSet) =>
  (which === 'why' ? s.whyReal : which === 'pageWhy' ? s.pageWhyReal : s.nextOptions) ?? []

// "Why is this real?" (and "why is the page real?") for real ones, and "what next?".
export async function answerScenarioChoices(id: number, which: ChoiceSet, ticked: number[]): Promise<ScenarioChoiceResponse> {
  if (!['why', 'pageWhy', 'next'].includes(which) || !isTicks(ticked)) throw new Error('Invalid answer')
  const s = await load(id)
  if (which !== 'next' && s.verdict !== 'real') throw new Error('This scenario has no reasons to choose')
  return choiceStep(choiceOptions(s, which), ticked)
}

// Replays every answer, so the score is the server's own. A future "you beat X% of
// players today" feature can save this number and trust it.
async function score(s: Scenario, answers: ScenarioAnswers): Promise<ScenarioSummary> {
  const verdict = s.verdict as Verdict
  const page = s.medium === 'search' ? 'The search result' : 'The ad'
  const steps = [
    { name: 'Real or fake', points: verdictPoints(answers.verdict === verdict) },
    ...backups(s).map((backup) => ({
      name: backup.part === 'landing' ? 'The page' : hasPage(s) ? page : 'Backing it up',
      points:
        backup.kind === 'flags'
          ? flagStep(s, backup.part, backup.part === 'landing' ? answers.pageGuesses : answers.guesses, true).step.points
          : choiceStep(choiceOptions(s, backup.part === 'landing' ? 'pageWhy' : 'why'), backup.part === 'landing' ? answers.pageWhyTicked : answers.whyTicked).step.points,
    })),
    { name: 'What to do next', points: choiceStep(s.nextOptions ?? [], answers.nextTicked).step.points },
  ]
  return {
    percent: scenarioPercent(steps.map((step) => step.points)),
    steps,
    verdict,
    verdictReason: s.verdictReason ?? null,
    explanation: s.explanation ?? null,
  }
}

const isAnswers = (a: unknown): a is ScenarioAnswers => {
  const x = a as ScenarioAnswers
  return (
    typeof x === 'object' &&
    x !== null &&
    isVerdict(x.verdict) &&
    isGuesses(x.guesses) &&
    isGuesses(x.pageGuesses) &&
    isTicks(x.whyTicked) &&
    isTicks(x.pageWhyTicked) &&
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

