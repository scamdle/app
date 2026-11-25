import type { Stars } from '@/lib/scoring/types'
import type { Guess, TokenMark } from '@/lib/scoring/textFlags'
import type { AdPlatform, Platform } from './options'

export type PlayableEmail = { kind: 'email'; fromName: string; fromAddress: string; subject: string; body: string }
export type PlayableMessage = { kind: 'message'; platform: Platform; sender: string; bubbles: string[] }
export type PlayableLink = { kind: 'link'; context: string | null; url: string }
export type PlayableAd = {
  kind: 'ad'
  platform: AdPlatform
  pageName: string
  text: string
  headline: string
  displayUrl: string
  buttonText: string
}
export type PlayableSearch = { kind: 'search'; query: string; title: string; displayUrl: string; snippet: string; sponsored: boolean }
export type PlayableLanding = { url: string; siteName: string; headline: string; body: string; buttonText: string }

type Base = { id: number; title: string; description: string }

// Everything the browser gets before answering. Nothing here gives an answer away.
export type Playable = Base &
  (
    | { format: 'spot-text'; content: PlayableEmail | PlayableMessage | PlayableLink; flagCount: number; maxWrong: number }
    | { format: 'real-or-fake'; content: PlayableLink }
    | { format: 'what-next'; content: PlayableEmail | PlayableMessage; scenario: string; options: string[] }
  )

export type ResultItem = { kind: 'good' | 'bad' | 'missed'; word?: string; label: string; reason: string | null }

export type LevelResult = { stars: Stars; items: ResultItem[]; explanation: unknown }

export type GuessResponse = {
  found: number
  total: number
  wrong: number
  maxWrong: number
  marks: TokenMark[]
  result: LevelResult | null
}

export type VerdictResponse = { answer: 'real' | 'fake'; result: LevelResult }
export type OptionsResponse = { correct: boolean[]; result: LevelResult }

export type { Guess }

// Scenario mode: every scenario is a scam. Step 1 asks what it wants Anna to do, then one
// red-flag step per part (message, ad or result; the page; the reviews), then what next.
export type ScenarioContent = PlayableEmail | PlayableMessage | PlayableAd | PlayableSearch

export type PlayableCheck = { query: string; site: string; rating: string; reviews: string[] }

export type ScenarioPart = 'content' | 'landing' | 'check'
export type ScenarioFlagStep = { part: ScenarioPart; flagCount: number; maxWrong: number }

// Everything the browser gets before answering: no answers, only how many flags each step has.
export type PlayableScenario = Base & {
  content: ScenarioContent
  landing: PlayableLanding | null
  check: PlayableCheck | null
  wantOptions: string[] | null
  flagSteps: ScenarioFlagStep[]
  nextPrompt: string
  nextOptions: string[]
}

// `points` runs from 0 to 1; every step is worth the same share of the score.
export type ScenarioStepResult = { points: number; items: ResultItem[] }

export type ScenarioGuessResponse = {
  found: number
  total: number
  wrong: number
  maxWrong: number
  marks: TokenMark[]
  step: ScenarioStepResult | null
}

export type ScenarioChoiceResponse = { correct: boolean[]; step: ScenarioStepResult }

export type ScenarioAnswers = {
  wantsTicked: number[]
  guesses: Record<ScenarioPart, Guess[]>
  nextTicked: number[]
}

export type ScenarioSummary = {
  percent: number
  steps: { name: string; points: number }[]
  verdictReason: string | null
  explanation: unknown
}

export type DailyTask = { id: number; title: string }
export type DailySetView =
  | { mode: 'three-tasks'; date: string; number: number; tasks: DailyTask[] }
  // `all` lists every published scenario while the testing switch is on, otherwise null.
  | { mode: 'scenario'; date: string; number: number; scenario: DailyTask | null; all: DailyTask[] | null }
