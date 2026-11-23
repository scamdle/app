'use client'

import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import {
  answerScenarioChoices,
  answerScenarioVerdict,
  finishScenario,
  guessScenarioFlags,
} from '@/app/(frontend)/scenario/[id]/actions'
import type {
  PlayableScenario,
  ScenarioAnswers,
  ScenarioBackup,
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

type Phase = 'play' | 'summary' | 'feedback' | 'thanks'

// Real or fake → one "back it up" step per part (ads and search results: the ad or result,
// then the page) → what next. The middle steps are only known once the verdict is in.
type Step = { kind: 'verdict' } | { kind: 'backup'; backup: ScenarioBackup } | { kind: 'next' }

const SHARE: Record<number, string> = { 2: 'half', 3: 'a third', 4: 'a quarter' }

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

  const [verdict, setVerdict] = useState<ScenarioVerdictResponse | null>(null)
  const [picked, setPicked] = useState<Verdict | null>(null)
  // The current step's result, once it's answered. Cleared when moving on.
  const [result, setResult] = useState<ScenarioStepResult | null>(null)
  const [summary, setSummary] = useState<ScenarioSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const answers = useRef<ScenarioAnswers>({ verdict: 'fake', guesses: [], pageGuesses: [], whyTicked: [], pageWhyTicked: [], nextTicked: [] })

  const hasPage = scenario.landing !== null
  const thing = scenario.content.kind === 'search' ? 'search result' : scenario.content.kind === 'ad' ? 'ad' : 'message'
  const steps: Step[] = [
    { kind: 'verdict' },
    ...(verdict?.backups ?? []).map((backup): Step => ({ kind: 'backup', backup })),
    { kind: 'next' },
  ]
  // Before the verdict, assume the usual: an ad or result has a page step too.
  const stepCount = verdict ? steps.length : hasPage ? 4 : 3
  const step = steps[stepIndex]
  const isLast = step.kind === 'next'

  const stepName = (s: Step) => {
    if (s.kind === 'verdict') return 'Real or fake'
    if (s.kind === 'next') return 'What to do next'
    if (s.backup.part === 'landing') return 'The page'
    return hasPage ? `The ${thing}` : 'Backing it up'
  }

  const heading = useFocusOnChange(intro ? null : `${phase}-${stepIndex}`)
  const askFeedback = Boolean(feedback && day && !feedbackGiven(day))
  const howTo = hasPage
    ? `Four steps: decide if the ${thing} is real or fake, show why, look at the page Anna lands on, then choose what to do next.`
    : 'Three steps: decide if it’s real or fake, show why, then choose what to do next.'
  // Wherever Anna clicked, she ends up on the page, even when it's a fake.
  const landingIntro = verdict?.verdict === 'fake' ? 'Anna clicked it anyway and landed on this page:' : 'Anna clicked it and landed on this page:'

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

  const part = step.kind === 'backup' ? step.backup.part : 'content'
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

  const continueButton = (
    <Button className="mt-6 w-full sm:w-auto" onClick={() => void (isLast ? busy || finish() : goNext())}>
      {isLast ? (busy ? 'One moment…' : 'See your score') : `Continue to step ${stepIndex + 2}`}
    </Button>
  )

  const explanation = summary?.explanation as Parameters<typeof RichText>[0]['data'] | null

  // The view next to a step: the ad or result itself, or the page once Anna has clicked.
  const view = (where: 'content' | 'landing', intro?: string) => <ScenarioContentView scenario={scenario} part={where} intro={intro} />

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

      {phase === 'play' && (
        <h2 ref={heading} tabIndex={-1} className="mb-4 font-display text-xl font-extrabold">
          Step {stepIndex + 1} of {stepCount}: {stepName(step)}
        </h2>
      )}

      {phase === 'play' && step.kind === 'verdict' && (
        <>
          <p className="mb-5">Look closely. Is this real or fake?</p>
          {view('content')}
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
              <Button className="mt-5 w-full sm:w-auto" autoFocus onClick={goNext}>
                Continue
              </Button>
            </section>
          )}
        </>
      )}

      {phase === 'play' && step.kind === 'backup' && step.backup.kind === 'flags' && (
        <div key={stepIndex}>
          <p className="mb-5">
            Find {plural(step.backup.flagCount, 'red flag', 'red flags')}
            {step.backup.part === 'landing' ? ' on the page' : hasPage ? ` in the ${thing}` : ''}. Tap each sentence or web address that looks suspicious. You
            can make {plural(step.backup.maxWrong, 'wrong guess', 'wrong guesses')}.
          </p>
          <SpotText
            flagCount={step.backup.flagCount}
            maxWrong={step.backup.maxWrong}
            check={checkWords}
            onDone={(response, guesses) => {
              if (part === 'landing') answers.current.pageGuesses = guesses
              else answers.current.guesses = guesses
              setResult(response.step)
            }}
          >
            {(text) => <ScenarioContentView scenario={scenario} text={text} part={part} intro={part === 'landing' ? landingIntro : undefined} />}
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

      {phase === 'play' && step.kind === 'backup' && step.backup.kind === 'why' && (
        <div key={stepIndex}>
          <div className="grid items-start gap-5 md:grid-cols-2">
            {view(part, part === 'landing' ? landingIntro : undefined)}
            <ChoiceList
              heading={part === 'landing' ? 'Why is this page real?' : hasPage ? `Why is this ${thing} real?` : 'Why is this real?'}
              options={step.backup.options}
              submit={async (ticked) => {
                const response = await answerScenarioChoices(scenario.id, part === 'landing' ? 'pageWhy' : 'why', ticked)
                if (part === 'landing') answers.current.pageWhyTicked = ticked
                else answers.current.whyTicked = ticked
                setResult(response.step)
                return { correct: response.correct, reasons: response.step.items.map((item) => item.reason) }
              }}
            />
          </div>
          {result && continueButton}
        </div>
      )}

      {phase === 'play' && step.kind === 'next' && (
        <div key={stepIndex}>
          <div className="grid items-start gap-5 md:grid-cols-2">
            {/* Anna is on the page by now, so ads and results show only that. */}
            {view(hasPage ? 'landing' : 'content', hasPage ? 'Anna is on this page:' : undefined)}
            <ChoiceList
              heading={scenario.nextPrompt}
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
          <h3 className="mt-6 font-display text-2xl font-extrabold">This {thing} was {summary.verdict}</h3>
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
