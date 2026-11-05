'use client'

import { RichText } from '@payloadcms/richtext-lexical/react'
import { useEffect, useRef } from 'react'

import type { LevelResult, ResultItem } from '@/lib/exercises/types'

import { Button } from './Button'

const KINDS: Record<ResultItem['kind'], { word: string; style: string }> = {
  good: { word: 'Correct', style: 'text-good' },
  bad: { word: 'Wrong', style: 'text-bad' },
  missed: { word: 'Missed', style: 'text-miss' },
}

export function Results({ result, onContinue }: { result: LevelResult; onContinue: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    heading.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  }, [])

  const explanation = result.explanation as Parameters<typeof RichText>[0]['data'] | null

  return (
    <section className="on-paper mt-6 rounded-2xl bg-paper p-5 text-ink sm:p-7">
      <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold">
        Here’s what happened
      </h2>
      <ul className="mt-4 divide-y divide-mist">
        {result.items.map((item, i) => (
          <li key={i} className="py-3">
            <strong className={`block ${KINDS[item.kind].style}`}>{item.word ?? KINDS[item.kind].word}</strong>
            <strong className="block break-words">{item.label}</strong>
            {item.reason ? <p className="mt-1">{item.reason}</p> : item.kind === 'bad' ? <p className="mt-1">This part wasn’t a red flag.</p> : null}
          </li>
        ))}
      </ul>
      {explanation?.root && <RichText data={explanation} className="mt-4 border-t-2 border-mist pt-4" />}
      <Button className="mt-5 w-full sm:w-auto" onClick={onContinue}>
        Continue
      </Button>
    </section>
  )
}
