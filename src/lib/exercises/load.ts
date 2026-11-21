import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import type { Exercise, Scenario } from '@/payload-types'

// Reads the whole exercise, answers included, for server code only. Anonymous visitors only
// get published exercises; logged-in editors can also try their drafts.
export async function loadExercise(id: unknown): Promise<Exercise | null> {
  if (!Number.isSafeInteger(id) || (id as number) <= 0) return null
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const exercise = await payload.findByID({ collection: 'exercises', id: id as number, depth: 1, disableErrors: true })
  if (!exercise || (exercise.status !== 'published' && !user)) return null
  return exercise
}

// Same rules for scenarios.
export async function loadScenario(id: unknown): Promise<Scenario | null> {
  if (!Number.isSafeInteger(id) || (id as number) <= 0) return null
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const scenario = await payload.findByID({ collection: 'scenarios', id: id as number, depth: 0, disableErrors: true })
  if (!scenario || (scenario.status !== 'published' && !user)) return null
  return scenario
}
