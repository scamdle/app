'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { submitFeedback } from '@/app/(frontend)/scenario/[id]/actions'
import type { ScenarioAnswers } from '@/lib/exercises/types'
import { COMMENT_MAX, SCALE, type FeedbackForm as FeedbackFormData } from '@/lib/feedback'
import { deviceId, rememberFeedback, savedAgeGroup } from '@/lib/progress'

import { Button } from '../level/Button'

const OPTION = 'flex min-h-16 cursor-pointer items-center justify-center rounded-xl border-4 px-3 py-2 text-center text-xl font-bold'
const PICKED = 'border-navy bg-sun text-ink'
const IDLE = 'border-mist bg-paper text-ink hover:border-navy'

// One question per screen with big buttons: quick to answer on a phone, and easy to follow.
export function FeedbackForm({ form, day, scenarioId, getAnswers, onDone, onSkip }: {
  form: FeedbackFormData
  day: string
  scenarioId: number
  getAnswers: () => ScenarioAnswers
  onDone: () => void
  onSkip?: () => void
}) {
  const scales = form.questions.filter((q) => q.type === 'scale')
  const commentQuestion = form.questions.find((q) => q.type === 'comment')
  // Screen 0 is the age group, then one per scale question, then the optional comment.
  const total = 1 + scales.length + (commentQuestion ? 1 : 0)

  const [screen, setScreen] = useState(0)
  // Remembered from earlier days on this device. The form only appears after playing, so this never runs on the server.
  const [ageGroup, setAgeGroup] = useState<string | null>(() => {
    const saved = savedAgeGroup()
    return saved && form.ageGroups.some((g) => g.value === saved) ? saved : null
  })
  const [values, setValues] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const commentId = useId()

  useEffect(() => {
    heading.current?.focus()
  }, [screen])

  const question = screen >= 1 && screen <= scales.length ? scales[screen - 1] : null
  const isComment = commentQuestion && screen === total - 1
  const answered = screen === 0 ? ageGroup !== null : question ? values[question.key] !== undefined : true
  const isLast = screen === total - 1

  const send = async () => {
    if (!ageGroup) return
    setBusy(true)
    try {
      const result = await submitFeedback(
        { deviceId: deviceId(), day, scenarioId, ageGroup, answers: values, comment },
        getAnswers(),
      )
      if (result.ok || result.error.startsWith('You already sent')) {
        rememberFeedback(day, ageGroup)
        onDone()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Something went wrong sending your answers. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const next = () => (isLast ? void send() : setScreen((s) => s + 1))

  return (
    <section className="on-paper rounded-2xl bg-paper p-5 text-ink sm:p-7">
      <p className="text-lg">
        Question {screen + 1} of {total} · Your answers are anonymous and only used to improve Scamdle, a university project.
      </p>

      {screen === 0 && (
        <fieldset className="mt-4">
          <legend>
            <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold">
              How old are you?
            </h2>
          </legend>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {form.ageGroups.map((group) => (
              <label key={group.value} className={`${OPTION} ${ageGroup === group.value ? PICKED : IDLE}`}>
                <input
                  type="radio"
                  name="age-group"
                  value={group.value}
                  checked={ageGroup === group.value}
                  onChange={() => setAgeGroup(group.value)}
                  className="sr-only"
                />
                {group.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {question && (
        <fieldset className="mt-4">
          <legend>
            <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold">
              {question.text}
            </h2>
          </legend>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
            {SCALE.map((n) => {
              const label = n === 1 ? question.lowLabel : n === 5 ? question.highLabel : null
              return (
                <label key={n} className={`${OPTION} flex-col ${values[question.key] === n ? PICKED : IDLE}`}>
                  <input
                    type="radio"
                    name={question.key}
                    value={n}
                    checked={values[question.key] === n}
                    onChange={() => setValues((v) => ({ ...v, [question.key]: n }))}
                    className="sr-only"
                  />
                  <span className="text-3xl">{n}</span>
                  {label && <span className="sr-only">: {label}</span>}
                </label>
              )
            })}
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between gap-4 text-lg">
            <span>{question.lowLabel}</span>
            <span className="text-right">{question.highLabel}</span>
          </div>
        </fieldset>
      )}

      {isComment && (
        <div className="mt-4">
          <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold">
            <label htmlFor={commentId}>{commentQuestion.text}</label>
          </h2>
          <p className="mt-1">This one is optional.</p>
          <textarea
            id={commentId}
            value={comment}
            maxLength={COMMENT_MAX}
            rows={5}
            onChange={(e) => setComment(e.target.value)}
            className="mt-3 w-full rounded-xl border-4 border-mist p-3 text-xl focus:border-navy"
          />
        </div>
      )}

      {error && <p role="alert" className="mt-3 font-bold text-bad">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        {screen > 0 && (
          <Button look="plain" onClick={() => setScreen((s) => s - 1)}>
            Back
          </Button>
        )}
        <Button disabled={!answered || busy} onClick={next}>
          {isLast ? (busy ? 'Sending…' : 'Send') : 'Next'}
        </Button>
        {onSkip && (
          <Button look="plain" onClick={onSkip}>
            Skip
          </Button>
        )}
      </div>
      {!answered && <p className="mt-2">Choose an answer to go on.</p>}
    </section>
  )
}
