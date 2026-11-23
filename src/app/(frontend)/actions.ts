'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { DailySetView } from '@/lib/exercises/types'
import { DEFAULT_REGION } from '@/lib/regions'
import { getGameSettings } from '@/lib/settings'

// The browser sends its local date. Nobody on earth is more than 14 hours ahead of UTC,
// so later dates can't be used to peek at upcoming sets.
const latestDate = () => new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10)

export async function getDailySet(day: string): Promise<DailySetView | null> {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const latest = latestDate()
  const date = day > latest ? latest : day

  const payload = await getPayload({ config })
  const { mode, showAllScenarios } = await getGameSettings()
  // In scenario mode only sets with a scenario count, so an older 3-task-only set isn't picked.
  const where = {
    region: { equals: DEFAULT_REGION },
    date: { less_than_equal: date },
    ...(mode === 'scenario' ? { scenario: { exists: true } } : {}),
  }
  const { docs, totalDocs } = await payload.find({ collection: 'daily-sets', where, sort: '-date', limit: 1, depth: 1 })
  const set = docs[0]

  if (mode === 'scenario') {
    // Testing switch: every published scenario, so testers don't have to edit the daily set.
    const all = showAllScenarios
      ? (
          await payload.find({
            collection: 'scenarios',
            where: { status: { equals: 'published' } },
            sort: '-updatedAt',
            limit: 100,
            depth: 0,
            select: { title: true },
          })
        ).docs.map(({ id, title }) => ({ id, title }))
      : null
    if (!set) return all ? { mode, date, number: 0, scenario: null, all } : null
    const scenario = typeof set.scenario === 'object' && set.scenario?.status === 'published' ? set.scenario : null
    return { mode, date: set.date, number: totalDocs, scenario: scenario && { id: scenario.id, title: scenario.title }, all }
  }

  if (!set) return null

  return {
    mode,
    date: set.date,
    number: totalDocs,
    tasks: (set.exercises ?? []).flatMap((exercise) =>
      typeof exercise === 'object' && exercise.status === 'published' ? [{ id: exercise.id, title: exercise.title }] : [],
    ),
  }
}
