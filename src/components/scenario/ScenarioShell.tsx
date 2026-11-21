'use client'

import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import {
  answerScenarioChoices,
  answerScenarioVerdict,
  finishScenario,
  guessScenarioFlags,
} from '@/app/(frontend)/scenario/[id]/actions'
import type {
  PlayableScenario,
  ScenarioAnswers,
  ScenarioStepResult,
  ScenarioSummary,
  ScenarioVerdictResponse,
  Verdict,
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

const CHOICES = [
  { value: 'fake', label: 'Fake', mark: '✕', style: 'border-bad text-bad' },
  { value: 'real', label: 'Real', mark: '✓', style: 'border-good text-good' },
] as const

type Phase = 'step1' | 'step2' | 'step3' | 'summary' | 'feedback' | 'thanks'

const STEP_NAMES = ['Real or fake', 'Backing it up', 'What to do next']

const HOW_TO = 'Three steps: decide if it’s real or fake, show why, then choose what to do next.'

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
  const [phase, setPhase] = useState<Phase>('step1')
  const [error, setError] = useState(false)

  const [verdict, setVerdict] = useState<ScenarioVerdictResponse | null>(null)
  const [picked, setPicked] = useState<Verdict | null>(null)
  const [step2, setStep2] = useState<ScenarioStepResult | null>(null)
  const [step3, setStep3] = useState<ScenarioStepResult | null>(null)
  const [summary, setSummary] = useState<ScenarioSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const answers = useRef<ScenarioAnswers>({ verdict: 'fake', guesses: [], whyTicked: [], nextTicked: [] })

  const heading = useFocusOnChange(intro ? null : phase)
  const stepNumber = phase === 'step1' ? 1 : phase === 'step2' ? 2 : phase === 'step3' ? 3 : null
  const askFeedback = Boolean(feedback && day && !feedbackGiven(day))

  const choose = async (value: Verdict) => {
    setPicked(value)
    try {
      const response = await answerScenarioVerdict(scenario.id, value)
      answers.current.verdict = value
      setVerdict(response)
      setError(false)
    } catch {
      setPicked(null)
      setError(true)
    }
  }

  const checkWords = useCallback(
    (guesses: Guess[], giveUp: boolean) =>
      guessScenarioFlags(scenario.id, guesses, giveUp).then((response) => ({ ...response, done: Boolean(response.step) })),
    [scenario.id],
  )

  const finish = async () => {
    setBusy(true)
    try {
      const result = await finishScenario(scenario.id, answers.current)
      setSummary(result)
      if (day) saveBestScore(day, scenario.id, result.percent)
      setPhase('summary')
      setError(false)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  const showLanding = phase !== 'step1'
  const explanation = summary?.explanation as Parameters<typeof RichText>[0]['data'] | null

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 pb-10">
      <header className="mb-2 flex items-center gap-4">
        {/* While the form is required, the way home is through it. */}
        {!(feedback?.required && askFeedback && (phase === 'summary' || phase === 'feedback')) && (
          <Link href="/" className="inline-flex min-h-12 shrink-0 items-center rounded-lg pr-1 font-bold whitespace-nowrap underline underline-offset-4">
            ← Home
          </Link>
        )}
        <h1 className="font-display text-2xl font-extrabold text-sun">{scenario.title}</h1>
      </header>

      {stepNumber && (
        <h2 ref={heading} tabIndex={-1} className="mb-4 font-display text-xl font-extrabold">
          Step {stepNumber} of 3: {STEP_NAMES[stepNumber - 1]}
        </h2>
      )}

      {phase === 'step1' && (
        <>
          <p className="mb-5">Look closely. Is this real or fake?</p>
          <ScenarioContentView scenario={scenario} showLanding={false} />
          <div className="mt-5 grid grid-cols-2 gap-4">
            {CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                disabled={picked !== null}
                aria-pressed={picked === choice.value}
                onClick={() => void choose(choice.value)}
                className={`flex cursor-pointer flex-col items-center rounded-2xl border-[6px] bg-paper py-4 font-display disabled:cursor-default ${choice.style} ${picked && picked !== choice.value ? 'opacity-60' : ''}`}
              >
                <span aria-hidden="true" className="text-7xl leading-none font-black">{choice.mark}</span>
                <span className="mt-1 text-2xl font-extrabold">{choice.label}</span>
                {picked === choice.value && <span className="font-body text-lg font-bold text-ink">Your answer</span>}
              </button>
            ))}
          </div>
          {verdict && (
            <section aria-live="polite" className="on-paper mt-6 rounded-2xl bg-paper p-5 text-ink sm:p-7">
              <p className={`font-display text-3xl font-extrabold ${verdict.correct ? 'text-good' : 'text-bad'}`}>
                {verdict.correct ? `Right, it’s ${verdict.verdict}.` : `Not quite: it’s ${verdict.verdict}.`}
              </p>
              <p className="mt-2">
                {verdict.verdict === 'fake' ? 'Next, find what gives it away.' : 'Next, choose what shows it’s real.'} We’ll explain everything at the end.
              </p>
              <Button className="mt-5 w-full sm:w-auto" autoFocus onClick={() => setPhase('step2')}>
                Continue
              </Button>
            </section>
          )}
        </>
      )}

      {phase === 'step2' && verdict?.step2.kind === 'flags' && (
        <>
          <p className="mb-5">
            Find {verdict.step2.flagCount} red {verdict.step2.flagCount === 1 ? 'flag' : 'flags'}. Tap each sentence or web address that looks suspicious
            {scenario.landing ? `, in the ${scenario.content.kind === 'search' ? 'search result' : 'ad'} and on the page` : ''}. You can make {verdict.step2.maxWrong} wrong{' '}
            {verdict.step2.maxWrong === 1 ? 'guess' : 'guesses'}.
          </p>
          <SpotText
            flagCount={verdict.step2.flagCount}
            maxWrong={verdict.step2.maxWrong}
            check={checkWords}
            onDone={(response, guesses) => {
              answers.current.guesses = guesses
              setStep2(response.step)
            }}
          >
            {(text) => <ScenarioContentView scenario={scenario} text={text} showLanding={showLanding} />}
          </SpotText>
        </>
      )}

      {phase === 'step2' && verdict?.step2.kind === 'why' && (
        <div className="grid items-start gap-5 md:grid-cols-2">
          <ScenarioContentView scenario={scenario} showLanding={showLanding} />
          <ChoiceList
            heading="Why is this real?"
            options={verdict.step2.options}
            submit={async (ticked) => {
              const response = await answerScenarioChoices(scenario.id, 'why', ticked)
              answers.current.whyTicked = ticked
              setStep2(response.step)
              return response.correct
            }}
          />
        </div>
      )}

      {phase === 'step2' && step2 && (
        <Results items={step2.items} heading="How you did on step 2" onContinue={() => setPhase('step3')} />
      )}

      {phase === 'step3' && (
        <>
          <div className="grid items-start gap-5 md:grid-cols-2">
            <ScenarioContentView scenario={scenario} showLanding={showLanding} />
            <ChoiceList
              heading={scenario.nextPrompt}
              options={scenario.nextOptions}
              submit={async (ticked) => {
                const response = await answerScenarioChoices(scenario.id, 'next', ticked)
                answers.current.nextTicked = ticked
                setStep3(response.step)
                return response.correct
              }}
            />
          </div>
          {step3 && (
            <Results
              items={step3.items}
              heading="How you did on step 3"
              continueLabel={busy ? 'One moment…' : 'See your score'}
              onContinue={() => void (busy || finish())}
            />
          )}
        </>
      )}

      {phase === 'summary' && summary && (
        <section className="on-paper rounded-2xl bg-paper p-5 text-ink sm:p-7">
          <h2 ref={heading} tabIndex={-1} className="font-display text-3xl font-extrabold">
            Your score
          </h2>
          <p className="mt-2 font-display text-7xl leading-none font-black text-navy">{summary.percent}%</p>
          <p className="mt-3">Each step counts for a third of your score.</p>
          <ul className="mt-3 divide-y divide-mist">
            {summary.steps.map((points, i) => (
              <li key={i} className="flex justify-between gap-4 py-2">
                <span>Step {i + 1}: {STEP_NAMES[i]}</span>
                <strong className="whitespace-nowrap">{Math.round(points * 100)}%</strong>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-display text-2xl font-extrabold">This message was {summary.verdict}</h3>
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
        <p className="mt-3 border-l-4 border-sun pl-3 font-bold">{HOW_TO}</p>
        <Button className="mt-6 w-full" autoFocus onClick={() => setIntro(false)}>
          Start
        </Button>
      </Modal>
    </main>
  )
}
