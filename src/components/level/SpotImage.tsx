'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'

import { checkCircles } from '@/app/(frontend)/level/[id]/actions'
import type { LevelResult, Playable, RevealedDot } from '@/lib/exercises/types'
import type { Placement } from '@/lib/scoring/imageDots'

import { Button } from './Button'
import { PictureView } from './views'

type Circle = { id: number; x: number | null; y: number | null; locked: boolean }
type Drag = { id: number; startX: number; startY: number; x: number; y: number; moved: boolean }

const clamp = (n: number) => Math.min(100, Math.max(0, n))
const round = (n: number) => Math.round(n * 10) / 10
// The dark edge keeps circles visible on any picture.
const RING =
  'flex size-14 items-center justify-center rounded-full border-[5px] shadow-[0_0_0_2px_var(--color-ink),inset_0_0_0_2px_var(--color-ink)] touch-none select-none'

export function SpotImage({ exercise, onFinish }: {
  exercise: Extract<Playable, { format: 'spot-image' }>
  onFinish: (result: LevelResult) => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const rounds = useRef<Placement[][]>([])
  const refocus = useRef<number | null>(null)
  const buttons = useRef(new Map<number, HTMLButtonElement>())
  const [circles, setCircles] = useState<Circle[]>(() =>
    Array.from({ length: exercise.dotCount }, (_, id) => ({ id, x: null, y: null, locked: false })),
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [checksLeft, setChecksLeft] = useState(3)
  const [revealed, setRevealed] = useState<RevealedDot[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const dragRef = useRef<Drag | null>(null)
  const updateDrag = (next: Drag | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const finished = revealed !== null
  const found = circles.filter((circle) => circle.locked).length
  const open = circles.filter((circle) => !circle.locked)
  const allPlaced = open.every((circle) => circle.x !== null)

  const place = (id: number, x: number | null, y: number | null) =>
    setCircles((list) => list.map((circle) => (circle.id === id ? { ...circle, x, y } : circle)))

  const pointToImage = (clientX: number, clientY: number): Placement | null => {
    const box = frame.current?.getBoundingClientRect()
    if (!box || clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom) return null
    return { x: round(((clientX - box.left) / box.width) * 100), y: round(((clientY - box.top) / box.height) * 100) }
  }

  // Follows the finger on the whole window, because the circle can leave its tray and the image.
  const dragId = drag?.id ?? null
  useEffect(() => {
    if (dragId === null) return
    const move = (event: PointerEvent) => {
      const current = dragRef.current
      if (!current) return
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 8
      updateDrag({ ...current, x: event.clientX, y: event.clientY, moved })
    }
    const up = (event: PointerEvent) => {
      const current = dragRef.current
      if (!current) return
      if (current.moved) {
        const point = pointToImage(event.clientX, event.clientY)
        place(current.id, point?.x ?? null, point?.y ?? null)
        setSelected(null)
      } else {
        setSelected((value) => (value === current.id ? null : current.id))
      }
      updateDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragId])

  useEffect(() => {
    if (refocus.current !== null) {
      buttons.current.get(refocus.current)?.focus()
      refocus.current = null
    }
  })

  const startDrag = (event: ReactPointerEvent, circle: Circle) => {
    if (finished || circle.locked) return
    event.preventDefault()
    updateDrag({ id: circle.id, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false })
  }

  const onKey = (event: KeyboardEvent, circle: Circle) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      refocus.current = circle.id
      place(circle.id, null, null)
      return
    }
    const step: Record<string, [number, number]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }
    const by = step[event.key]
    if (!by) return
    event.preventDefault()
    refocus.current = circle.id
    place(circle.id, clamp((circle.x ?? 50) + by[0]), clamp((circle.y ?? 50) + by[1]))
  }

  const check = async () => {
    const placements = open.map((circle) => ({ x: circle.x!, y: circle.y! }))
    setBusy(true)
    try {
      const response = await checkCircles(exercise.id, [...rounds.current, placements])
      rounds.current.push(placements)
      setChecksLeft(response.checksLeft)
      const results = new Map(open.map((circle, i) => [circle.id, response.lastRound[i]]))
      setCircles((list) =>
        list.map((circle) => {
          if (circle.locked) return circle
          return results.get(circle.id) ? { ...circle, locked: true } : { ...circle, x: null, y: null }
        }),
      )
      setSelected(null)
      setError(false)
      if (response.dots) setRevealed(response.dots)
      if (response.result) onFinish(response.result)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const circleLabel = (circle: Circle, i: number) => {
    if (circle.locked) return `Circle ${i + 1}, correct`
    return `Circle ${i + 1}. Drag or tap it, or use the arrow keys to move it.`
  }

  const renderCircle = (circle: Circle, i: number) => {
    const dragging = drag?.id === circle.id && drag.moved
    const isSelected = selected === circle.id
    return (
      <button
        key={circle.id}
        ref={(node) => {
          if (node) buttons.current.set(circle.id, node)
          else buttons.current.delete(circle.id)
        }}
        type="button"
        aria-label={circleLabel(circle, i)}
        aria-pressed={isSelected}
        disabled={finished || circle.locked}
        onPointerDown={(event) => startDrag(event, circle)}
        onClick={(event) => {
          // Pointers are handled above; this is the keyboard's Enter or Space.
          if (event.detail === 0) setSelected(isSelected ? null : circle.id)
          event.stopPropagation()
        }}
        onKeyDown={(event) => onKey(event, circle)}
        style={circle.x !== null ? { left: `${circle.x}%`, top: `${circle.y}%` } : undefined}
        className={`${RING} ${circle.x !== null ? 'absolute -translate-x-1/2 -translate-y-1/2' : ''} ${
          circle.locked ? 'border-good bg-good-soft/80 text-good' : 'cursor-grab border-sun'
        } ${isSelected ? 'bg-sun' : ''} ${dragging ? 'opacity-30' : ''}`}
      >
        {circle.locked ? <span aria-hidden="true" className="text-2xl font-bold">✓</span> : <span className="size-2.5 rounded-full bg-ink ring-2 ring-paper" />}
      </button>
    )
  }

  return (
    <>
      <div aria-live="polite" className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xl font-bold">
        <span>Spots found: <span className="text-sun">{found}/{exercise.dotCount}</span></span>
        <span>Checks left: <span className="text-sun">{checksLeft}</span></span>
      </div>

      <div
        ref={frame}
        // Keeps the picture and the circle tray on screen together, so nobody has to scroll mid-drag.
        style={{ width: `min(100%, calc((100dvh - 16rem) * ${exercise.image.width / exercise.image.height}))` }}
        className="on-paper relative mx-auto overflow-hidden rounded-2xl"
        onClick={(event) => {
          if (selected === null) return
          const point = pointToImage(event.clientX, event.clientY)
          if (point) {
            place(selected, point.x, point.y)
            setSelected(null)
          }
        }}
      >
        <PictureView image={exercise.image} className="pointer-events-none" />
        {!finished && circles.map((circle, i) => (circle.x !== null ? renderCircle(circle, i) : null))}
        {revealed?.map((dot, i) => (
          <span
            key={i}
            style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: `${dot.radius * 2}%` }}
            className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-4 ${dot.found ? 'border-good' : 'border-miss'}`}
          >
            <span
              className={`absolute top-0 left-0 flex size-8 items-center justify-center rounded-full text-lg font-bold text-paper ${dot.found ? 'bg-good' : 'bg-miss'}`}
            >
              {i + 1}
            </span>
          </span>
        ))}
      </div>

      {!finished && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-h-16 flex-wrap items-center gap-3">
            {open.some((circle) => circle.x === null) ? (
              circles.map((circle, i) => (circle.x === null ? renderCircle(circle, i) : null))
            ) : (
              <span>All circles placed.</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {selected !== null && <span className="font-bold text-sun">Now tap the picture</span>}
            {selected === null && !allPlaced && <span>Place every circle first</span>}
            <Button disabled={!allPlaced || busy} onClick={() => void check()}>
              Check
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 font-bold text-sun">Something went wrong. Please press Check again.</p>}

      {drag?.moved && (
        <span
          aria-hidden="true"
          style={{ left: drag.x, top: drag.y }}
          className={`${RING} pointer-events-none fixed z-10 -translate-x-1/2 -translate-y-1/2 border-sun`}
        >
          <span className="size-2.5 rounded-full bg-ink ring-2 ring-paper" />
        </span>
      )}
    </>
  )
}
