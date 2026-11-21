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

// Scenario mode: one message, three steps. Step 2 depends on the verdict, so its data
// only arrives with the step 1 answer: sending it up front would give the verdict away.
export type ScenarioContent = PlayableEmail | PlayableMessage | PlayableAd | PlayableSearch

export type PlayableScenario = Base & {
  content: ScenarioContent
  landing: PlayableLanding | null
  nextPrompt: string
  nextOptions: string[]
}

export type Verdict = 'real' | 'fake'

export type ScenarioStep2 = { kind: 'flags'; flagCount: number; maxWrong: number } | { kind: 'why'; options: string[] }

export type ScenarioVerdictResponse = { correct: boolean; verdict: Verdict; step2: ScenarioStep2 }

// `points` runs from 0 to 1; each of the three steps is worth a third of the score.
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

export type ScenarioAnswers = { verdict: Verdict; guesses: Guess[]; whyTicked: number[]; nextTicked: number[] }

export type ScenarioSummary = {
  percent: number
  steps: [number, number, number]
  verdict: Verdict
  verdictReason: string | null
  explanation: unknown
}

export type DailyTask = { id: number; title: string }
export type DailySetView =
  | { mode: 'three-tasks'; date: string; number: number; tasks: DailyTask[] }
  | { mode: 'scenario'; date: string; number: number; scenario: DailyTask | null }
