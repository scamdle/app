import type { Scenario } from '@/payload-types'

import type { AdPlatform } from './options'
import { toEmail, toMessage } from './toPlayable'
import type { PlayableLanding, PlayableScenario, ScenarioContent } from './types'

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

// The only way scenario data reaches the browser before an answer. No verdict, flags or
// "why real" options here: which step 2 a scenario has would give the verdict away.
export function toPlayableScenario(s: Scenario): PlayableScenario | null {
  const content = toContent(s)
  const nextOptions = (s.nextOptions ?? []).map((option) => option.text)
  if (!content || !s.verdict || nextOptions.length === 0) return null
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    content,
    landing: toLanding(s),
    nextPrompt: s.nextPrompt ?? '',
    nextOptions,
  }
}
