'use client'

import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import {
  answerScenarioChoices,
  finishScenario,
  guessScenarioFlags,
} from '@/app/(frontend)/scenario/[id]/actions'
import type {
  PlayableScenario,
  ScenarioAnswers,
  ScenarioFlagStep,
  ScenarioPart,
  ScenarioStepResult,
  ScenarioSummary,
} from '@/lib/exercises/types'
import type { FeedbackForm as FeedbackFormData } from '@/lib/feedback'
import { feedbackGiven, saveBestScore } from '@/lib/progress'
import type { Guess } from '@/lib/scoring/textFlags'

import { Button } from '../level/Button'
import { ChoiceList } from '../level/ChoiceList'
import { Modal } from '../level/Modal'
import { Results } from '../level/Results'
import { SpotText } from '../level/SpotText'
import { FeedbackForm } from './FeedbackForm'
import { ScenarioContentView } from './views'

type Phase = 'play' | 'summary' | 'feedback' | 'thanks'

// What does it want? → one red-flag step per part that has flags → what next?
type Step = { kind: 'wants' } | { kind: 'flags'; flags: ScenarioFlagStep } | { kind: 'next' }

const SHARE: Record<number, string> = { 2: 'half', 3: 'a third', 4: 'a quarter', 5: 'a fifth' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// Moves focus to the new step's heading, so screen readers and keyboards follow along.
function useFocusOnChange(key: unknown) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ref.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  }, [key])
  return ref
}

export function ScenarioShell({ scenario, day, feedback }: {
  scenario: PlayableScenario
  day: string | null
  feedback: FeedbackFormData | null
}) {
  const router = useRouter()
  const introId = useId()
  const [intro, setIntro] = useState(true)
  const [phase, setPhase] = useState<Phase>('play')
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState(false)

  // The current step's result, once it's answered. Cleared when moving on.
  const [result, setResult] = useState<ScenarioStepResult | null>(null)
  const [summary, setSummary] = useState<ScenarioSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const answers = useRef<ScenarioAnswers>({ wantsTicked: [], guesses: { content: [], landing: [], check: [] }, nextTicked: [] })

  const hasPage = scenario.landing !== null
  const steps: Step[] = [
    ...(scenario.wantOptions ? [{ kind: 'wants' } as const] : []),
    ...scenario.flagSteps.map((flags): Step => ({ kind: 'flags', flags })),
    { kind: 'next' },
  ]
  const stepCount = steps.length
  const step = steps[stepIndex]
  const isLast = step.kind === 'next'

  const heading = useFocusOnChange(intro ? null : `${phase}-${stepIndex}`)
  const askFeedback = Boolean(feedback && day && !feedbackGiven(day))
  const howTo = `${stepCount} short steps: find what this scam wants, spot the red flags, then choose what to do next.`
  const intros: Record<ScenarioPart, string | undefined> = {
    content: undefined,
    landing: 'Anna clicked it anyway and landed on this page:',
    check: 'Before paying, Anna looks for reviews. This is what she finds:',
  }

  const part = step.kind === 'flags' ? step.flags.part : 'content'
  const checkWords = (guesses: Guess[], giveUp: boolean) =>
    guessScenarioFlags(scenario.id, part, guesses, giveUp).then((response) => ({ ...response, done: Boolean(response.step) }))

  const goNext = () => {
    setResult(null)
    setStepIndex((i) => i + 1)
  }

  const finish = async () => {
    setBusy(true)
    try {
      const final = await finishScenario(scenario.id, answers.current)
      setSummary(final)
      if (day) saveBestScore(day, scenario.id, final.percent)
      setPhase('summary')
      setError(false)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  // The one thing to do on this step, shown big. `detail` is the smaller how-to under it.
  const instruction =
    step.kind === 'wants'
      ? 'What is this trying to get Anna to do?'
      : step.kind === 'next'
        ? scenario.nextPrompt
        : `Find ${plural(step.flags.flagCount, 'red flag', 'red flags')}.`
  const detail = step.kind === 'flags' ? 'Tap anything that looks suspicious.' : null

  const continueButton = (
    <Button className="mt-6 w-full sm:w-auto" onClick={() => void (isLast ? busy || finish() : goNext())}>
      {isLast ? (busy ? 'One moment…' : 'See your score') : `Continue to step ${stepIndex + 2}`}
    </Button>
  )

  const explanation = summary?.explanation as Parameters<typeof RichText>[0]['data'] | null

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-10">
      {/* The page title only matters in the intro pop-up, so screen readers get it and the
          screen shows what to do instead: older players need the instruction to stand out. */}
      <h1 className="sr-only">{scenario.title}</h1>
      <header className="mb-3 flex min-h-12 items-center justify-between gap-4 text-base">
        {/* While the form is required, the way home is through it. */}
        {!(feedback?.required && askFeedback && (phase === 'summary' || phase === 'feedback')) ? (
          <Link href="/" className="inline-flex min-h-12 items-center rounded-lg pr-1 font-bold whitespace-nowrap underline underline-offset-4">
            ← Home
          </Link>
        ) : (
          <span />
        )}
        {phase === 'play' && (
          <span aria-hidden="true" className="font-bold">
            Step {stepIndex + 1} of {stepCount}
          </span>
        )}
      </header>

      {phase === 'play' && (
        <div className="mb-5">
          <h2 ref={heading} tabIndex={-1} className="font-display text-3xl leading-tight font-extrabold text-sun sm:text-4xl">
            <span className="sr-only">
              Step {stepIndex + 1} of {stepCount}:{' '}
            </span>
            {instruction}
          </h2>
          {detail && <p className="mt-2 text-xl">{detail}</p>}
        </div>
      )}

      {phase === 'play' && step.kind === 'wants' && scenario.wantOptions && (
        <div key={stepIndex}>
          <div className="grid items-start gap-5 md:grid-cols-2">
            <ScenarioContentView scenario={scenario} />
            <ChoiceList
              options={scenario.wantOptions}
              submit={async (ticked) => {
                const response = await answerScenarioChoices(scenario.id, 'wants', ticked)
                answers.current.wantsTicked = ticked
                setResult(response.step)
                return { correct: response.correct, reasons: response.step.items.map((item) => item.reason) }
              }}
            />
          </div>
          {result && continueButton}
        </div>
      )}

      {phase === 'play' && step.kind === 'flags' && (
        <div key={stepIndex}>
          <SpotText
            flagCount={step.flags.flagCount}
            maxWrong={step.flags.maxWrong}
            check={checkWords}
            onDone={(response, guesses) => {
              answers.current.guesses[part] = guesses
              setResult(response.step)
            }}
          >
            {(text) => <ScenarioContentView scenario={scenario} text={text} part={part} intro={intros[part]} />}
          </SpotText>
          {result && (
            <Results
              items={result.items}
              heading={`How you did on step ${stepIndex + 1}`}
              continueLabel={`Continue to step ${stepIndex + 2}`}
              onContinue={goNext}
            />
          )}
        </div>
      )}

      {phase === 'play' && step.kind === 'next' && (
        <div key={stepIndex}>
          <div className="grid items-start gap-5 md:grid-cols-2">
            {/* Anna is on the page by now, so ads and results show only that. */}
            <ScenarioContentView scenario={scenario} part={hasPage ? 'landing' : 'content'} intro={hasPage ? 'Anna is on this page:' : undefined} />
            <ChoiceList
              options={scenario.nextOptions}
              submit={async (ticked) => {
                const response = await answerScenarioChoices(scenario.id, 'next', ticked)
                answers.current.nextTicked = ticked
                setResult(response.step)
                return { correct: response.correct, reasons: response.step.items.map((item) => item.reason) }
              }}
            />
          </div>
          {result && continueButton}
        </div>
      )}

      {phase === 'summary' && summary && (
        <section className="on-paper rounded-2xl bg-paper p-5 text-ink sm:p-7">
          <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold">
            Your score
          </h2>
          <p className="mt-2 font-display text-7xl leading-none font-black text-navy">{summary.percent}%</p>
          <p className="mt-3">Each step counts for {SHARE[summary.steps.length] ?? 'an equal share'} of your score.</p>
          <ul className="mt-3 divide-y divide-mist">
            {summary.steps.map((s, i) => (
              <li key={i} className="flex justify-between gap-4 py-2">
                <span>Step {i + 1}: {s.name}</span>
                <strong className="whitespace-nowrap">{Math.round(s.points * 100)}%</strong>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-display text-2xl font-extrabold">How this scam works</h3>
          {summary.verdictReason && <p className="mt-2 whitespace-pre-wrap">{summary.verdictReason}</p>}
          {explanation?.root && <RichText data={explanation} className="mt-4 border-t-2 border-mist pt-4" />}
          {askFeedback ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button autoFocus onClick={() => setPhase('feedback')}>
                Next: a few quick questions
              </Button>
              {!feedback?.required && (
                <Button look="plain" onClick={() => router.push('/')}>
                  Skip, back to home
                </Button>
              )}
            </div>
          ) : (
            <Button className="mt-6 w-full sm:w-auto" autoFocus onClick={() => router.push('/')}>
              Back to home
            </Button>
          )}
        </section>
      )}

      {phase === 'feedback' && feedback && day && (
        <FeedbackForm
          form={feedback}
          day={day}
          scenarioId={scenario.id}
          getAnswers={() => answers.current}
          onDone={() => setPhase('thanks')}
          onSkip={feedback.required ? undefined : () => router.push('/')}
        />
      )}

      {phase === 'thanks' && (
        <section className="on-paper rounded-2xl bg-paper p-5 text-center text-ink sm:p-7">
          <h2 ref={heading} tabIndex={-1} className="font-display text-4xl font-extrabold">
            Thank you!
          </h2>
          <p className="mt-3">Your answers help us make Scamdle better. See you tomorrow.</p>
          <Button className="mt-6 w-full sm:w-auto" autoFocus onClick={() => router.push('/')}>
            Back to home
          </Button>
        </section>
      )}

      {error && <p role="alert" className="mt-3 font-bold text-sun">Something went wrong. Please try again.</p>}

      <Modal open={intro} labelledBy={introId} onClose={() => setIntro(false)}>
        <h2 id={introId} className="font-display text-3xl font-extrabold">
          {scenario.title}
        </h2>
        {scenario.description && <p className="mt-3">{scenario.description}</p>}
        <p className="mt-3 border-l-4 border-sun pl-3 font-bold">{howTo}</p>
        <Button className="mt-6 w-full" autoFocus onClick={() => setIntro(false)}>
          Start
        </Button>
      </Modal>
    </main>
  )
}
