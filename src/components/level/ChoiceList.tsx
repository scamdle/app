'use client'

import { useState } from 'react'

import { Button } from './Button'

const verdict = (isCorrect: boolean, isTicked: boolean) => {
  if (isCorrect) return isTicked ? { word: 'Right to tick', tone: 'good' } : { word: 'Should be ticked', tone: 'miss' }
  return isTicked ? { word: 'Should not be ticked', tone: 'bad' } : { word: 'Right to skip', tone: 'good' }
}

const TONES: Record<string, { border: string; text: string }> = {
  good: { border: 'border-good', text: 'text-good' },
  miss: { border: 'border-miss', text: 'text-miss' },
  bad: { border: 'border-bad', text: 'text-bad' },
}

// Tick every right answer, then one Check. `submit` asks the server and returns which options were correct.
export function ChoiceList({ heading, options, submit }: {
  heading: string
  options: string[]
  submit: (ticked: number[]) => Promise<boolean[]>
}) {
  const [ticked, setTicked] = useState<number[]>([])
  const [correct, setCorrect] = useState<boolean[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const check = async () => {
    setBusy(true)
    try {
      setCorrect(await submit(ticked))
      setError(false)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl leading-snug font-extrabold">{heading}</h2>
      <fieldset className="mt-4">
        <legend className="mb-2 font-bold">Tick every right answer:</legend>
        <div className="flex flex-col gap-3">
          {options.map((option, i) => {
            const isTicked = ticked.includes(i)
            const after = correct && verdict(correct[i], isTicked)
            return (
              <label key={i} className={`on-paper flex min-h-14 items-start gap-3 rounded-xl border-4 bg-paper p-3 text-ink ${after ? TONES[after.tone].border : 'cursor-pointer border-transparent'}`}>
                <input
                  type="checkbox"
                  checked={isTicked}
                  // Not `disabled`: browsers fade those until players can't see what they chose.
                  aria-disabled={correct !== null}
                  onChange={() => {
                    if (correct === null) setTicked((list) => (isTicked ? list.filter((n) => n !== i) : [...list, i]))
                  }}
                  className="mt-1 size-7 shrink-0 accent-navy"
                />
                <span>
                  {option}
                  {after && <strong className={`block ${TONES[after.tone].text}`}>{after.word}</strong>}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      {correct === null && (
        <>
          <Button className="mt-4 w-full" disabled={ticked.length === 0 || busy} onClick={() => void check()}>
            Check
          </Button>
          {ticked.length === 0 && <p className="mt-2 text-center">Tick at least one answer</p>}
        </>
      )}
      {error && <p role="alert" className="mt-3 font-bold text-sun">Something went wrong. Please press Check again.</p>}
    </section>
  )
}
