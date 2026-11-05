import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'

import { RedFlagsEmail } from './RedFlagsEmail'

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const exercise = await payload.findByID({ collection: 'exercises', id, disableErrors: true, overrideAccess: false })

  if (!exercise || exercise.format !== 'spot-red-flags' || !exercise.email) notFound()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-lg">
      <h1 className="mb-2 text-3xl font-bold">{exercise.title}</h1>
      <p className="mb-6">Anna got this email. Click everything that looks suspicious.</p>
      <RedFlagsEmail email={exercise.email} />
    </main>
  )
}