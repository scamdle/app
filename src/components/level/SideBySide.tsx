'use client'

import { useState } from 'react'

import { answerSide } from '@/app/(frontend)/level/[id]/actions'
import type { LevelResult, Playable, SideItem } from '@/lib/exercises/types'

import { Button } from './Button'
import { PictureView, VideoView } from './views'

type Side = 'left' | 'right'

export function SideBySide({ exercise, onFinish }: {
  exercise: Extract<Playable, { format: 'side-by-side' }>
  onFinish: (result: LevelResult) => void
}) {
  const [picked, setPicked] = useState<Side | null>(null)
  const [realSide, setRealSide] = useState<Side | null>(null)
  const [error, setError] = useState(false)

  const choose = async (side: Side) => {
    setPicked(side)
    try {
      const response = await answerSide(exercise.id, side)
      setRealSide(response.realSide)
      setError(false)
      onFinish(response.result)
    } catch {
      setPicked(null)
      setError(true)
    }
  }

  const panel = (side: Side, name: string, item: SideItem) => (
    <div key={side} className="flex flex-col gap-3 rounded-2xl bg-navy-deep p-3">
      <h2 className="font-display text-3xl font-extrabold text-sun">
        {name}
        {realSide && <span className="ml-3 text-paper">{realSide === side ? 'Real' : 'Fake'}</span>}
        {realSide && picked === side && <span className="ml-3 font-body text-xl font-bold text-paper">Your answer</span>}
      </h2>
      {item.image && <div className="overflow-hidden rounded-xl"><PictureView image={item.image} /></div>}
      {item.video && <VideoView video={item.video} title={`Video ${name}`} />}
      {!realSide && (
        <Button className="mt-auto w-full" disabled={picked !== null} onClick={() => void choose(side)}>
          {name} is real
        </Button>
      )}
    </div>
  )

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {panel('left', 'A', exercise.left)}
        {panel('right', 'B', exercise.right)}
      </div>
      {error && <p role="alert" className="mt-3 font-bold text-sun">Something went wrong. Please choose again.</p>}
    </>
  )
}
