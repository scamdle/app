'use server'

import { loadExercise } from '@/lib/exercises/load'
import { textSegments } from '@/lib/exercises/segments'
import { realIsLeft } from '@/lib/exercises/toPlayable'
import type {
  CheckResponse,
  GuessResponse,
  LevelResult,
  OptionsResponse,
  ResultItem,
  SideResponse,
  VerdictResponse,
} from '@/lib/exercises/types'
import { optionStars, verdictStars } from '@/lib/scoring/choices'
import { DOT_RADIUS, MAX_CHECKS, scoreImageDots, type Dot, type Placement } from '@/lib/scoring/imageDots'
import { scoreTextFlags, type Guess } from '@/lib/scoring/textFlags'
import type { Exercise } from '@/payload-types'

// These run on the server and anyone can call them, so inputs are checked and answers
// leave only with the final results. Nothing is saved: the client resends its guesses.

const LIMIT = 500

const isGuess = (g: unknown): g is Guess =>
  typeof g === 'object' && g !== null && typeof (g as Guess).segment === 'string' && Number.isInteger((g as Guess).token)

const isPlacement = (p: unknown): p is Placement =>
  typeof p === 'object' && p !== null && Number.isFinite((p as Placement).x) && Number.isFinite((p as Placement).y)

async function load(id: unknown, check: (e: Exercise) => boolean): Promise<Exercise> {
  const exercise = await loadExercise(id)
  if (!exercise || !check(exercise)) throw new Error('Exercise not found')
  return exercise
}

const finish = (stars: LevelResult['stars'], items: ResultItem[], e: Exercise): LevelResult => ({
  stars,
  items,
  explanation: e.explanation ?? null,
})

export async function guessWord(id: number, guesses: Guess[], giveUp = false): Promise<GuessResponse> {
  if (!Array.isArray(guesses) || guesses.length > LIMIT || !guesses.every(isGuess)) throw new Error('Invalid guesses')
  const e = await load(id, (x) => x.format === 'spot-red-flags' && x.medium !== 'image')
  const flags = e.flags ?? []
  const maxWrong = e.maxWrongGuesses ?? 3
  const score = scoreTextFlags({
    segments: textSegments(e),
    flags: flags.map((flag) => flag.text),
    guesses,
    maxWrong,
    giveUp: giveUp === true,
  })

  return {
    found: score.found.length,
    total: flags.length,
    wrong: score.wrong.length,
    maxWrong,
    marks: score.marks,
    result: score.finished
      ? finish(
          score.stars,
          [
            ...score.found.map((i): ResultItem => ({ kind: 'good', label: flags[i].text, reason: flags[i].reason })),
            ...score.missed.map((i): ResultItem => ({ kind: 'missed', label: flags[i].text, reason: flags[i].reason })),
            ...score.wrong.map((word): ResultItem => ({ kind: 'bad', label: word, reason: null })),
          ],
          e,
        )
      : null,
  }
}

export async function checkCircles(id: number, rounds: Placement[][]): Promise<CheckResponse> {
  const valid = Array.isArray(rounds) && rounds.length <= MAX_CHECKS && rounds.every((r) => Array.isArray(r) && r.length <= LIMIT && r.every(isPlacement))
  if (!valid) throw new Error('Invalid placements')
  const e = await load(id, (x) => x.format === 'spot-red-flags' && x.medium === 'image')
  const dots = (Array.isArray(e.dots) ? e.dots : []) as Dot[]
  const media = typeof e.image === 'object' ? e.image : null
  const aspect = media?.width && media.height ? media.height / media.width : 1
  const score = scoreImageDots({ dots, rounds, aspect })
  const found = new Set(score.found)

  return {
    found: found.size,
    total: dots.length,
    checksLeft: MAX_CHECKS - score.checksUsed,
    lastRound: score.lastRound,
    dots: score.finished
      ? dots.map((dot, i) => ({ x: dot.x, y: dot.y, radius: DOT_RADIUS[dot.size], found: found.has(i), reason: dot.reason }))
      : null,
    result: score.finished
      ? finish(
          score.stars,
          dots.map((dot, i): ResultItem => ({
            kind: found.has(i) ? 'good' : 'missed',
            label: `Spot ${i + 1}`,
            reason: dot.reason,
          })),
          e,
        )
      : null,
  }
}

export async function answerVerdict(id: number, answer: 'real' | 'fake'): Promise<VerdictResponse> {
  if (answer !== 'real' && answer !== 'fake') throw new Error('Invalid answer')
  const e = await load(id, (x) => x.format === 'real-or-fake')
  const correct = e.verdict === answer
  return {
    answer: e.verdict === 'real' ? 'real' : 'fake',
    result: finish(
      verdictStars(correct),
      [{ kind: correct ? 'good' : 'bad', label: `This is ${e.verdict}`, reason: e.answerReason ?? null }],
      e,
    ),
  }
}

export async function answerSide(id: number, side: 'left' | 'right'): Promise<SideResponse> {
  if (side !== 'left' && side !== 'right') throw new Error('Invalid answer')
  const e = await load(id, (x) => x.format === 'side-by-side')
  const realSide = realIsLeft(e.id) ? 'left' : 'right'
  const correct = side === realSide
  return {
    realSide,
    result: finish(
      verdictStars(correct),
      [{ kind: correct ? 'good' : 'bad', label: `${realSide === 'left' ? 'A' : 'B'} is the real one`, reason: e.answerReason ?? null }],
      e,
    ),
  }
}

export async function answerOptions(id: number, ticked: number[]): Promise<OptionsResponse> {
  if (!Array.isArray(ticked) || ticked.length > LIMIT || !ticked.every(Number.isInteger)) throw new Error('Invalid answer')
  const e = await load(id, (x) => x.format === 'what-next')
  const options = e.options ?? []
  const correct = options.map((option) => option.isCorrect === true)
  return {
    correct,
    result: finish(
      optionStars(correct, ticked),
      options.map((option, i): ResultItem => {
        const wasTicked = ticked.includes(i)
        const label = option.text
        const reason = option.explanation ?? null
        if (correct[i]) return wasTicked ? { kind: 'good', word: 'Right to tick', label, reason } : { kind: 'missed', word: 'Should be ticked', label, reason }
        return wasTicked ? { kind: 'bad', word: 'Should not be ticked', label, reason } : { kind: 'good', word: 'Right to skip', label, reason }
      }),
      e,
    ),
  }
}
