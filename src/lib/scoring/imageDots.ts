import type { DotSize } from '@/lib/exercises/options'
import type { Stars } from './types'

export const MAX_CHECKS = 3

// Target radius as a percentage of the image width.
export const DOT_RADIUS: Record<DotSize, number> = { small: 5, medium: 8, large: 13 }

export type Dot = { x: number; y: number; size: DotSize; reason: string }
export type Placement = { x: number; y: number }

export type ImageDotsScore = {
  found: number[]
  lastRound: boolean[]
  checksUsed: number
  finished: boolean
  stars: Stars
}

export function imageDotStars(found: number, total: number, checksUsed: number): Stars {
  if (found === 0) return 0
  if (found < total) return 1
  return checksUsed === 1 ? 3 : 2
}

// x and y are percentages of width and height, so `aspect` (height / width) makes distances fair
// on images that aren't square. Replays every Check so the server needs no session.
export function scoreImageDots(args: { dots: Dot[]; rounds: Placement[][]; aspect: number }): ImageDotsScore {
  const { dots, aspect } = args
  const rounds = args.rounds.slice(0, MAX_CHECKS)
  const found = new Set<number>()
  let lastRound: boolean[] = []
  let checksUsed = 0

  for (const round of rounds) {
    if (found.size === dots.length) break
    checksUsed++
    // A round can't hold more circles than there are dots left, so scattering extras doesn't help.
    lastRound = round.slice(0, dots.length - found.size).map((placement) => {
      let best = -1
      let bestDistance = Infinity
      dots.forEach((dot, i) => {
        if (found.has(i)) return
        const distance = Math.hypot(placement.x - dot.x, (placement.y - dot.y) * aspect)
        if (distance <= DOT_RADIUS[dot.size] && distance < bestDistance) {
          best = i
          bestDistance = distance
        }
      })
      if (best === -1) return false
      found.add(best)
      return true
    })
  }

  return {
    found: [...found],
    lastRound,
    checksUsed,
    finished: found.size === dots.length || checksUsed >= MAX_CHECKS,
    stars: imageDotStars(found.size, dots.length, checksUsed),
  }
}
