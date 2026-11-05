'use client'

import { useState } from 'react'

import { answerVerdict } from '@/app/(frontend)/level/[id]/actions'
import type { LevelResult, Playable } from '@/lib/exercises/types'

import { LinkView, PictureView, VideoView } from './views'

const CHOICES = [
  { value: 'fake', label: 'Fake', mark: '✕', style: 'border-bad text-bad' },
  { value: 'real', label: 'Real', mark: '✓', style: 'border-good text-good' },
] as const

export function RealOrFake({ exercise, onFinish }: {
  exercise: Extract<Playable, { format: 'real-or-fake' }>
  onFinish: (result: LevelResult) => void
}) {
  const [picked, setPicked] = useState<'real' | 'fake' | null>(null)
  const [answer, setAnswer] = useState<'real' | 'fake' | null>(null)
  const [error, setError] = useState(false)
  const { content } = exercise

  const choose = async (value: 'real' | 'fake') => {
    setPicked(value)
    try {
      const response = await answerVerdict(exercise.id, value)
      setAnswer(response.answer)
      setError(false)
      onFinish(response.result)
    } catch {
      setPicked(null)
      setError(true)
    }
  }

  return (
    <>
      {content.kind === 'link' && <LinkView link={content} />}
      {content.kind === 'image' && <div className="overflow-hidden rounded-2xl"><PictureView image={content.image} /></div>}
      {content.kind === 'video' && <VideoView video={content.video} title={exercise.title} />}

      <div className="mt-5 grid grid-cols-2 gap-4">
        {CHOICES.map((choice) => {
          const isAnswer = answer === choice.value
          return (
            <button
              key={choice.value}
              type="button"
              disabled={picked !== null}
              onClick={() => void choose(choice.value)}
              className={`flex cursor-pointer flex-col items-center rounded-2xl border-[6px] bg-paper py-4 font-display disabled:cursor-default ${choice.style}`}
            >
              <span aria-hidden="true" className="text-7xl leading-none font-black">{choice.mark}</span>
              <span className="mt-1 text-2xl font-extrabold">{choice.label}</span>
              {answer && (picked === choice.value || isAnswer) && (
                <span className="font-body text-lg font-bold text-ink">
                  {[picked === choice.value && 'Your answer', isAnswer && 'Correct answer'].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {error && <p role="alert" className="mt-3 font-bold text-sun">Something went wrong. Please choose again.</p>}
    </>
  )
}
