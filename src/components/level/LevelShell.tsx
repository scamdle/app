'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

import type { LevelResult, Playable } from '@/lib/exercises/types'
import { saveBestStars } from '@/lib/progress'

import { Button } from './Button'
import { howToPlay } from './howTo'
import { Modal } from './Modal'
import { Results } from './Results'
import { SideBySide } from './SideBySide'
import { RealOrFake } from './RealOrFake'
import { SpotImage } from './SpotImage'
import { SpotText } from './SpotText'
import { Stars } from './Stars'
import { WhatNext } from './WhatNext'

const PRAISE = [
  { title: 'Good try', text: 'This one was tricky. Now you know what to look for next time.' },
  { title: 'Good start', text: "You spotted some of it. Every scam you study gets easier to catch." },
  { title: 'Well done', text: 'You got most of it. Keep that careful eye.' },
  { title: 'Excellent', text: 'You saw right through it.' },
]

export function LevelShell({ exercise, day }: { exercise: Playable; day: string | null }) {
  const router = useRouter()
  const introId = useId()
  const starsId = useId()
  const [phase, setPhase] = useState<'intro' | 'play' | 'stars'>('intro')
  const [result, setResult] = useState<LevelResult | null>(null)

  const finish = (levelResult: LevelResult) => {
    setResult(levelResult)
    if (day) saveBestStars(day, exercise.id, levelResult.stars)
  }

  const praise = PRAISE[result?.stars ?? 0]

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-10">
      <header className="mb-2 flex items-center gap-4">
        <Link href="/" className="inline-flex min-h-12 shrink-0 items-center rounded-lg pr-1 font-bold whitespace-nowrap underline underline-offset-4">
          ← Home
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-sun">{exercise.title}</h1>
      </header>
      <p className="mb-5">{howToPlay(exercise)}</p>

      {exercise.format === 'spot-text' && <SpotText exercise={exercise} onFinish={finish} />}
      {exercise.format === 'spot-image' && <SpotImage exercise={exercise} onFinish={finish} />}
      {exercise.format === 'real-or-fake' && <RealOrFake exercise={exercise} onFinish={finish} />}
      {exercise.format === 'side-by-side' && <SideBySide exercise={exercise} onFinish={finish} />}
      {exercise.format === 'what-next' && <WhatNext exercise={exercise} onFinish={finish} />}

      {result && <Results result={result} onContinue={() => setPhase('stars')} />}

      <Modal open={phase === 'intro'} labelledBy={introId} onClose={() => setPhase('play')}>
        <h2 id={introId} className="font-display text-3xl font-extrabold">
          {exercise.title}
        </h2>
        {exercise.description && <p className="mt-3">{exercise.description}</p>}
        <p className="mt-3 border-l-4 border-sun pl-3 font-bold">{howToPlay(exercise)}</p>
        <Button className="mt-6 w-full" autoFocus onClick={() => setPhase('play')}>
          Start
        </Button>
      </Modal>

      <Modal open={phase === 'stars'} labelledBy={starsId} onClose={() => router.push('/')}>
        <div className="text-center">
          <h2 id={starsId} className="font-display text-4xl font-extrabold">
            {praise.title}
          </h2>
          <div className="my-5">
            <Stars count={result?.stars ?? 0} size={64} emptyClass="text-navy-soft" edged />
          </div>
          <p>{praise.text}</p>
          <Button className="mt-6 w-full" autoFocus onClick={() => router.push('/')}>
            Back to home
          </Button>
        </div>
      </Modal>
    </main>
  )
}
