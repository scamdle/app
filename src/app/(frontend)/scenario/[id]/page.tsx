import { notFound } from 'next/navigation'

import { ScenarioShell } from '@/components/scenario/ScenarioShell'
import { loadScenario } from '@/lib/exercises/load'
import { toPlayableScenario } from '@/lib/exercises/toPlayableScenario'
import { getGameSettings } from '@/lib/settings'

export default async function ScenarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ day?: string | string[] }>
}) {
  const { id } = await params
  const { day } = await searchParams
  const scenario = await loadScenario(Number(id))
  const playable = scenario && toPlayableScenario(scenario)
  if (!playable) notFound()

  // Only scenarios opened from the home screen count towards today's score and feedback.
  const validDay = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
  const { feedback } = await getGameSettings()
  return <ScenarioShell scenario={playable} day={validDay} feedback={validDay ? feedback : null} />
}
