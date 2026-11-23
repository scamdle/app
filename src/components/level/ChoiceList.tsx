'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from './Button'

export type ChoiceCheck = { correct: boolean[]; reasons: (string | null)[] }

// One word per option: did the player handle it right (ticked a right answer, or left a wrong one empty)?
const TONES = {
  good: { word: 'Correct', mark: '✓', border: 'border-good', box: 'bg-good-soft', text: 'text-good' },
  bad: { word: 'Incorrect', mark: '✗', border: 'border-bad', box: 'bg-bad-soft', text: 'text-bad' },
}

// Tick every right answer, then one Check. `submit` asks the server which options were
// correct and why; the answers then open up inside each option.
export function ChoiceList({ heading, options, submit }: {
  heading: string
  options: string[]
  submit: (ticked: number[]) => Promise<ChoiceCheck>
}) {
  const [ticked, setTicked] = useState<number[]>([])
  const [checked, setChecked] = useState<ChoiceCheck | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const summary = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (checked) summary.current?.focus()
  }, [checked])

  const check = async () => {
    setBusy(true)
    try {
      setChecked(await submit(ticked))
      setError(false)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const rightCount = checked ? options.filter((_, i) => checked.correct[i] === ticked.includes(i)).length : 0

  return (
    <section>
      <h2 className="font-display text-2xl leading-snug font-extrabold">{heading}</h2>
      {checked && (
        <p ref={summary} tabIndex={-1} className="mt-3 text-xl font-bold">
          {rightCount} of {options.length} correct
        </p>
      )}
      <fieldset className="mt-4">
        <legend className="mb-2 font-bold">{checked ? 'Each answer explained:' : 'Tick every right answer:'}</legend>
        <div className="flex flex-col gap-3">
          {options.map((option, i) => {
            const isTicked = ticked.includes(i)
            const after = checked && TONES[checked.correct[i] === isTicked ? 'good' : 'bad']
            const reason = checked?.reasons[i]
            return (
              <label key={i} className={`on-paper flex flex-col overflow-hidden rounded-xl border-4 bg-paper text-ink ${after ? after.border : 'cursor-pointer border-transparent'}`}>
                <span className="flex min-h-14 items-start gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={isTicked}
                    // Not `disabled`: browsers fade those until players can't see what they chose.
                    aria-disabled={checked !== null}
                    onChange={() => {
                      if (checked === null) setTicked((list) => (isTicked ? list.filter((n) => n !== i) : [...list, i]))
                    }}
                    className="mt-1 size-7 shrink-0 accent-navy"
                  />
                  <span>{option}</span>
                </span>
                {after && (
                  <span className={`block border-t-2 border-mist p-3 ${after.box}`}>
                    <strong className={`block text-lg ${after.text}`}>
                      <span aria-hidden="true">{after.mark} </span>
                      {after.word}
                    </strong>
                    {reason && <span className="mt-1 block">{reason}</span>}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </fieldset>
      {checked === null && (
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
