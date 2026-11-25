type Text = string | null | undefined

type TextContent = {
  medium?: string | null
  email?: { fromName?: Text; fromAddress?: Text; subject?: Text; body?: Text } | null
  message?: { sender?: Text; bubbles?: { text?: Text }[] | null } | null
  link?: { url?: Text } | null
  ad?: { pageName?: Text; text?: Text; headline?: Text; displayUrl?: Text; buttonText?: Text } | null
  search?: { sponsored?: boolean | null; title?: Text; displayUrl?: Text; snippet?: Text } | null
  landing?: { url?: Text; siteName?: Text; headline?: Text; body?: Text; buttonText?: Text } | null
  check?: { site?: Text; rating?: Text; reviews?: { text?: Text }[] | null } | null
}

// Fixed labels the game draws itself. They're tappable too: "Sponsored" can be a red flag.
export const SPONSORED = 'Sponsored'

// The pieces of text a player can tap, by a stable id. The browser renders them and the
// server checks guesses against them, so both sides must agree on this list.
export function textSegments(exercise: TextContent): Record<string, string> {
  const segments: Record<string, Text> = {}
  if (exercise.medium === 'email') {
    segments['email.fromName'] = exercise.email?.fromName
    segments['email.fromAddress'] = exercise.email?.fromAddress
    segments['email.subject'] = exercise.email?.subject
    segments['email.body'] = exercise.email?.body
  }
  if (exercise.medium === 'message') {
    segments['message.sender'] = exercise.message?.sender
    exercise.message?.bubbles?.forEach((bubble, i) => {
      segments[`message.bubble.${i}`] = bubble.text
    })
  }
  if (exercise.medium === 'link') segments['link.url'] = exercise.link?.url
  if (exercise.medium === 'ad') {
    const ad = exercise.ad
    segments['ad.pageName'] = ad?.pageName
    segments['ad.label'] = SPONSORED
    segments['ad.text'] = ad?.text
    segments['ad.displayUrl'] = ad?.displayUrl
    segments['ad.headline'] = ad?.headline
    segments['ad.buttonText'] = ad?.buttonText
  }
  if (exercise.medium === 'search') {
    const search = exercise.search
    if (search?.sponsored) segments['search.label'] = SPONSORED
    segments['search.displayUrl'] = search?.displayUrl
    segments['search.title'] = search?.title
    segments['search.snippet'] = search?.snippet
  }
  if (exercise.medium === 'ad' || exercise.medium === 'search') {
    const landing = exercise.landing
    segments['landing.url'] = landing?.url
    segments['landing.siteName'] = landing?.siteName
    segments['landing.headline'] = landing?.headline
    segments['landing.body'] = landing?.body
    segments['landing.buttonText'] = landing?.buttonText
  }
  // The reviews Anna finds when she checks a shop. Optional for any medium.
  segments['check.site'] = exercise.check?.site
  segments['check.rating'] = exercise.check?.rating
  exercise.check?.reviews?.forEach((review, i) => {
    segments[`check.review.${i}`] = review.text
  })
  return Object.fromEntries(Object.entries(segments).filter((e): e is [string, string] => Boolean(e[1])))
}

// A scenario is played in parts, each with its own red-flag step: the message, ad or result
// itself, then (ads and search results) the page Anna lands on, then (optional) the reviews
// she finds when she checks.
export const SCENARIO_PARTS = ['content', 'landing', 'check'] as const
export type ScenarioPart = (typeof SCENARIO_PARTS)[number]

const partOf = (id: string): ScenarioPart => (id.startsWith('landing.') ? 'landing' : id.startsWith('check.') ? 'check' : 'content')

export function partSegments(exercise: TextContent, part: ScenarioPart): Record<string, string> {
  return Object.fromEntries(Object.entries(textSegments(exercise)).filter(([id]) => partOf(id) === part))
}

// A flag counts in every part whose text contains it, so a "-80%" in both the ad and the
// page is never a wrong tap on either.
export const flagInPart = (exercise: TextContent, flag: string, part: ScenarioPart) =>
  Object.values(partSegments(exercise, part)).some((text) => text.includes(flag))

// Whether the scenario has reviews to check, so the reviews step is drawn at all.
export const hasCheck = (exercise: TextContent) => Object.keys(partSegments(exercise, 'check')).length > 0
