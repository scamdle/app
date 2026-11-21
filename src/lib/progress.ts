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

// Scenario mode keeps a 0–100% score instead of stars.
const SCORES_KEY = 'scamdle:scores'

type Scores = Record<string, Record<string, number>>

function readScores(): Scores {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) ?? '{}') as Scores
  } catch {
    return {}
  }
}

export function scoresForDay(day: string): Record<string, number> {
  return readScores()[day] ?? {}
}

export function saveBestScore(day: string, scenarioId: number, percent: number): void {
  const scores = readScores()
  const today = scores[day] ?? {}
  const best = Math.max(today[scenarioId] ?? 0, percent)
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify({ ...scores, [day]: { ...today, [scenarioId]: best } }))
  } catch {
    // The player just won't see their score on the home screen.
  }
}

// A random id for anonymous feedback, so one person's days can be linked without knowing who they are.
const DEVICE_KEY = 'scamdle:device'
const AGE_KEY = 'scamdle:age-group'
const FEEDBACK_KEY = 'scamdle:feedback-days'

export function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function savedAgeGroup(): string | null {
  try {
    return localStorage.getItem(AGE_KEY)
  } catch {
    return null
  }
}

export function feedbackGiven(day: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? '[]') as string[]).includes(day)
  } catch {
    return false
  }
}

export function rememberFeedback(day: string, ageGroup: string): void {
  try {
    const days = JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? '[]') as string[]
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify([...days.filter((d) => d !== day), day].slice(-60)))
    localStorage.setItem(AGE_KEY, ageGroup)
  } catch {
    // Nothing to do: the form may just show again.
  }
}
