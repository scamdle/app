import type { Scenario } from '@/payload-types'

import { SCENARIO_WANTS, type AdPlatform } from './options'
import { flagInPart, hasCheck, SCENARIO_PARTS } from './segments'
import { toEmail, toMessage } from './toPlayable'
import type { PlayableCheck, PlayableLanding, PlayableScenario, ScenarioContent, ScenarioFlagStep } from './types'

function toContent(s: Scenario): ScenarioContent | null {
  if (s.medium === 'email') return toEmail(s)
  if (s.medium === 'message') return toMessage(s)
  if (s.medium === 'ad') {
    return {
      kind: 'ad',
      platform: (s.ad?.platform ?? 'facebook') as AdPlatform,
      pageName: s.ad?.pageName ?? '',
      text: s.ad?.text ?? '',
      headline: s.ad?.headline ?? '',
      displayUrl: s.ad?.displayUrl ?? '',
      buttonText: s.ad?.buttonText ?? '',
    }
  }
  if (s.medium === 'search') {
    return {
      kind: 'search',
      query: s.search?.query ?? '',
      title: s.search?.title ?? '',
      displayUrl: s.search?.displayUrl ?? '',
      snippet: s.search?.snippet ?? '',
      sponsored: s.search?.sponsored === true,
    }
  }
  return null
}

const toLanding = (s: Scenario): PlayableLanding | null =>
  s.medium === 'ad' || s.medium === 'search'
    ? {
        url: s.landing?.url ?? '',
        siteName: s.landing?.siteName ?? '',
        headline: s.landing?.headline ?? '',
        body: s.landing?.body ?? '',
        buttonText: s.landing?.buttonText ?? '',
      }
    : null

const toCheck = (s: Scenario): PlayableCheck | null =>
  hasCheck(s)
    ? {
        query: s.check?.query ?? '',
        site: s.check?.site ?? '',
        rating: s.check?.rating ?? '',
        reviews: (s.check?.reviews ?? []).map((review) => review.text),
      }
    : null

// One red-flag step per part that has flags. A part without flags (e.g. a fake shop's
// page that looks fine) is skipped. Shared with the server, which scores the same steps.
export function scenarioFlagSteps(s: Scenario): ScenarioFlagStep[] {
  const maxWrong = s.maxWrongGuesses ?? 3
  return SCENARIO_PARTS.flatMap((part) => {
    const flagCount = (s.flags ?? []).filter((flag) => flagInPart(s, flag.text, part)).length
    return flagCount > 0 ? [{ part, flagCount, maxWrong }] : []
  })
}

// The only way scenario data reaches the browser before an answer: no flags, no correct
// options, only what's shown and how many flags each step has.
export function toPlayableScenario(s: Scenario): PlayableScenario | null {
  const content = toContent(s)
  const nextOptions = (s.nextOptions ?? []).map((option) => option.text)
  if (!content || nextOptions.length === 0) return null
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    content,
    landing: toLanding(s),
    check: toCheck(s),
    // Older scenarios without an answer here simply skip step 1.
    wantOptions: s.wants?.length ? SCENARIO_WANTS.map((want) => want.label) : null,
    flagSteps: scenarioFlagSteps(s),
    nextPrompt: s.nextPrompt ?? '',
    nextOptions,
  }
}
