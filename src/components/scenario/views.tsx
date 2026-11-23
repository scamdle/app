import type { PlayableAd, PlayableLanding, PlayableScenario, PlayableSearch } from '@/lib/exercises/types'
import { SPONSORED } from '@/lib/exercises/segments'

import { BreakableUrl, ChatView, EmailView, lines, plainText, type RenderText } from '../level/views'

// Familiar colours for each feed, without logos or exact copies.
const FEEDS = {
  facebook: { name: 'Facebook', button: 'bg-[#e4e6eb] text-ink', accent: 'bg-[#1b74e4]' },
  instagram: { name: 'Instagram', button: 'bg-[#0095f6] text-white', accent: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]' },
} as const

const tight = (text: RenderText) => (text === plainText ? '' : 'leading-12')

export function AdView({ ad, text = plainText }: { ad: PlayableAd; text?: RenderText }) {
  const feed = FEEDS[ad.platform]
  return (
    <article className="on-paper overflow-hidden rounded-2xl bg-paper text-ink">
      <header className="flex items-center gap-3 border-b border-mist px-5 py-3">
        <span aria-hidden="true" className={`grid size-12 shrink-0 place-items-center rounded-full text-xl font-bold text-white ${feed.accent}`}>
          {ad.pageName.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <strong className={`block text-xl break-words ${tight(text)}`}>{text('ad.pageName', ad.pageName)}</strong>
          <span className={`text-lg text-navy-soft ${tight(text)}`}>{text('ad.label', SPONSORED)} · {feed.name}</span>
        </span>
      </header>
      <p className={`px-5 py-4 break-words whitespace-pre-wrap ${lines(text)}`}>{text('ad.text', ad.text)}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mist bg-[#f0f2f5] px-5 py-4">
        <span className="min-w-0">
          <span className={`block font-mono text-lg uppercase [overflow-wrap:anywhere] text-navy-soft ${tight(text)}`}>
            {text('ad.displayUrl', ad.displayUrl)}
          </span>
          {ad.headline && <strong className={`block text-xl break-words ${tight(text)}`}>{text('ad.headline', ad.headline)}</strong>}
        </span>
        <span className={`rounded-lg px-4 py-2 font-bold ${feed.button} ${tight(text)}`}>{text('ad.buttonText', ad.buttonText)}</span>
      </div>
    </article>
  )
}

export function SearchView({ search, text = plainText }: { search: PlayableSearch; text?: RenderText }) {
  return (
    <article className="on-paper rounded-2xl bg-paper p-5 text-ink sm:p-7">
      <p className="rounded-full border-2 border-mist px-5 py-3 text-xl break-words">
        <span className="sr-only">Search: </span>
        {search.query}
      </p>
      <div className="mt-5">
        {search.sponsored && <strong className={`block text-lg ${tight(text)}`}>{text('search.label', SPONSORED)}</strong>}
        <span className={`block font-mono text-lg [overflow-wrap:anywhere] text-navy-soft ${tight(text)}`}>
          {text === plainText ? <BreakableUrl url={search.displayUrl} /> : text('search.displayUrl', search.displayUrl)}
        </span>
        <h2 className={`mt-1 text-2xl font-bold text-[#1a0dab] underline-offset-4 break-words ${text === plainText ? 'leading-snug underline' : 'leading-12'}`}>
          {text('search.title', search.title)}
        </h2>
        <p className={`mt-1 break-words ${lines(text)}`}>{text('search.snippet', search.snippet)}</p>
      </div>
    </article>
  )
}

export function LandingView({ landing, text = plainText }: { landing: PlayableLanding; text?: RenderText }) {
  return (
    <article className="on-paper overflow-hidden rounded-2xl bg-paper text-ink">
      <div className="bg-[#dee1e6] px-4 py-3">
        <p className={`rounded-full bg-paper px-4 py-2 font-mono text-lg [overflow-wrap:anywhere] ${tight(text)}`}>
          <span className="sr-only">Address: </span>
          {text === plainText ? <BreakableUrl url={landing.url} /> : text('landing.url', landing.url)}
        </p>
      </div>
      <div className="p-5 sm:p-7">
        {landing.siteName && <p className={`text-xl font-bold text-navy-soft ${tight(text)}`}>{text('landing.siteName', landing.siteName)}</p>}
        <h2 className={`mt-2 font-display text-3xl font-extrabold break-words ${text === plainText ? 'leading-tight' : 'leading-12'}`}>
          {text('landing.headline', landing.headline)}
        </h2>
        {landing.body && <div className={`mt-3 break-words whitespace-pre-wrap ${lines(text)}`}>{text('landing.body', landing.body)}</div>}
        {landing.buttonText && (
          <p className={`mt-5 inline-block rounded-lg bg-[#e8590c] px-6 py-3 text-xl font-bold text-white ${tight(text)}`}>
            {text('landing.buttonText', landing.buttonText)}
          </p>
        )}
      </div>
    </article>
  )
}

// One part of the scenario: the message, ad or result itself, or the page Anna landed on.
// Ads and search results show them on separate steps, so no screen gets too long.
export function ScenarioContentView({ scenario, text = plainText, part = 'content', intro }: {
  scenario: PlayableScenario
  text?: RenderText
  part?: 'content' | 'landing'
  intro?: string
}) {
  const { content, landing } = scenario
  if (part === 'landing') {
    return landing ? (
      <div className="flex flex-col gap-4">
        {intro && <p className="font-bold">{intro}</p>}
        <LandingView landing={landing} text={text} />
      </div>
    ) : null
  }
  return (
    <div className="flex flex-col gap-4">
      {content.kind === 'email' && <EmailView email={content} text={text} />}
      {content.kind === 'message' && <ChatView message={content} text={text} />}
      {content.kind === 'ad' && <AdView ad={content} text={text} />}
      {content.kind === 'search' && <SearchView search={content} text={text} />}
    </div>
  )
}
