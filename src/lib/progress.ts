import type { Stars } from './scoring/types'

const KEY = 'scamdle:stars'

type Progress = Record<string, Record<string, Stars>>

// Stars live on this device only. Storage can be blocked or empty, so the game must work without it.
function read(): Progress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Progress
  } catch {
    return {}
  }
}

export function starsForDay(day: string): Record<string, Stars> {
  return read()[day] ?? {}
}

// Replays are allowed, and the best result counts.
export function saveBestStars(day: string, exerciseId: number, stars: Stars): void {
  const progress = read()
  const today = progress[day] ?? {}
  const best = Math.max(today[exerciseId] ?? 0, stars) as Stars
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...progress, [day]: { ...today, [exerciseId]: best } }))
  } catch {
    // Nothing else to do: the player just won't see stars on the home screen.
  }
}
