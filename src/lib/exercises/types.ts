import type { Stars } from '@/lib/scoring/types'
import type { Guess, TokenMark } from '@/lib/scoring/textFlags'
import type { Platform } from './options'

export type PlayableImage = { url: string; width: number; height: number; alt: string }
export type PlayableVideo = { kind: 'file' | 'embed'; src: string }

export type PlayableEmail = { kind: 'email'; fromName: string; fromAddress: string; subject: string; body: string }
export type PlayableMessage = { kind: 'message'; platform: Platform; sender: string; bubbles: string[] }
export type PlayableLink = { kind: 'link'; context: string | null; url: string }
export type PlayableImageContent = { kind: 'image'; image: PlayableImage }
export type PlayableVideoContent = { kind: 'video'; video: PlayableVideo }

export type PlayableContent =
  | PlayableEmail
  | PlayableMessage
  | PlayableLink
  | PlayableImageContent
  | PlayableVideoContent

export type SideItem = { image?: PlayableImage; video?: PlayableVideo }

type Base = { id: number; title: string; description: string }

// Everything the browser gets before answering. Nothing here gives an answer away.
export type Playable = Base &
  (
    | { format: 'spot-text'; content: PlayableEmail | PlayableMessage | PlayableLink; flagCount: number; maxWrong: number }
    | { format: 'spot-image'; image: PlayableImage; dotCount: number }
    | { format: 'real-or-fake'; content: PlayableLink | PlayableImageContent | PlayableVideoContent }
    | { format: 'side-by-side'; left: SideItem; right: SideItem }
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

export type RevealedDot = { x: number; y: number; radius: number; found: boolean; reason: string }

export type CheckResponse = {
  found: number
  total: number
  checksLeft: number
  lastRound: boolean[]
  dots: RevealedDot[] | null
  result: LevelResult | null
}

export type VerdictResponse = { answer: 'real' | 'fake'; result: LevelResult }
export type SideResponse = { realSide: 'left' | 'right'; result: LevelResult }
export type OptionsResponse = { correct: boolean[]; result: LevelResult }

export type { Guess }

export type DailyTask = { id: number; title: string }
export type DailySetView = { date: string; number: number; tasks: DailyTask[] }
