import { notFound } from 'next/navigation'

import { LevelShell } from '@/components/level/LevelShell'
import { loadExercise } from '@/lib/exercises/load'
import { toPlayable } from '@/lib/exercises/toPlayable'

export default async function LevelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ day?: string | string[] }>
}) {
  const { id } = await params
  const { day } = await searchParams
  const exercise = await loadExercise(Number(id))
  const playable = exercise && toPlayable(exercise)
  if (!playable) notFound()

  // Only levels opened from the home screen count towards today's stars.
  const validDay = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
  return <LevelShell exercise={playable} day={validDay} />
}
