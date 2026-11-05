'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { DailySetView } from '@/lib/exercises/types'
import { DEFAULT_REGION } from '@/lib/regions'

// The browser sends its local date. Nobody on earth is more than 14 hours ahead of UTC,
// so later dates can't be used to peek at upcoming sets.
const latestDate = () => new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10)

export async function getDailySet(day: string): Promise<DailySetView | null> {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const latest = latestDate()
  const date = day > latest ? latest : day

  const payload = await getPayload({ config })
  const where = { region: { equals: DEFAULT_REGION }, date: { less_than_equal: date } }
  const { docs, totalDocs } = await payload.find({ collection: 'daily-sets', where, sort: '-date', limit: 1, depth: 1 })
  const set = docs[0]
  if (!set) return null

  return {
    date: set.date,
    number: totalDocs,
    tasks: (set.exercises ?? []).flatMap((exercise) =>
      typeof exercise === 'object' && exercise.status === 'published' ? [{ id: exercise.id, title: exercise.title }] : [],
    ),
  }
}
