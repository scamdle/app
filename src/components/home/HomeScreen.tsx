'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'

import { getDailySet } from '@/app/(frontend)/actions'
import { Button } from '@/components/level/Button'
import { Modal } from '@/components/level/Modal'
import { Stars } from '@/components/level/Stars'
import type { DailySetView } from '@/lib/exercises/types'
import { starsForDay } from '@/lib/progress'
import type { Stars as StarCount } from '@/lib/scoring/types'
import { dayKey } from '@/lib/dayKey'

const formatDate = (date: string) => date.split('-').reverse().join('.')

const ICON = 'size-14 sm:size-20 lg:size-24'

// A rounded cog with 8 lobes, as in the team's sketch.
const GEAR =
  Array.from({ length: 96 }, (_, i) => {
    const angle = (i / 96) * Math.PI * 2
    const radius = 9 + 1.7 * Math.cos(angle * 8)
    return `${i === 0 ? 'M' : 'L'}${(12 + radius * Math.cos(angle)).toFixed(2)} ${(12 + radius * Math.sin(angle)).toFixed(2)}`
  }).join(' ') + 'z'

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="cursor-pointer rounded-full p-1 hover:text-sun">
      {children}
    </button>
  )
}

export function HomeScreen() {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [set, setSet] = useState<DailySetView | null>(null)
  const [stars, setStars] = useState<Record<string, StarCount>>({})
  const [later, setLater] = useState<string | null>(null)
  const laterId = useId()

  useEffect(() => {
    let active = true
    const today = dayKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
    getDailySet(today)
      .then((daily) => {
        if (!active) return
        setSet(daily)
        if (daily) setStars(starsForDay(daily.date))
        setLoaded(true)
      })
      .catch(() => {
        if (!active) return
        setFailed(true)
        setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col px-4 pt-4 pb-10 sm:px-6">
      <nav aria-label="Menu" className="flex items-start justify-between">
        <IconButton label="Profile" onClick={() => setLater('Profile')}>
          <svg className={ICON} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" aria-hidden="true">
            <circle cx="24" cy="15" r="9" />
            <path d="M6 42v-5c0-2 1-3.5 3-4.500 4-2 9-3 15-3s11 1 15 3c2 1 3 2.500 3 4.500v5z" />
          </svg>
        </IconButton>
        <div className="flex gap-1 sm:gap-3">
          <IconButton label="Settings" onClick={() => setLater('Settings')}>
            <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d={GEAR} />
            </svg>
          </IconButton>
          <IconButton label="Information" onClick={() => setLater('Information')}>
            <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 11v6" />
              <path d="M12 7.500v.1" strokeWidth="1.600" />
            </svg>
          </IconButton>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-8 text-center">
        <h1 className="font-display text-[clamp(3.5rem,18vw,4.5rem)] leading-none font-extrabold text-sun sm:text-8xl">Scamdle</h1>
        <p className="mt-3 min-h-9 text-2xl sm:text-4xl">{set && `Daily #${set.number} · ${formatDate(set.date)}`}</p>

        {loaded && set && set.tasks.length > 0 && (
          <ol className="mt-10 grid w-full max-w-sm grid-cols-1 gap-7 sm:mt-14 sm:max-w-none sm:grid-cols-3 sm:gap-8">
            {set.tasks.map((task, i) => (
              <li key={task.id} className="flex flex-col items-center gap-3">
                <Stars count={stars[task.id] ?? 0} size={60} gapClass="gap-3 lg:gap-6" />
                <Link
                  href={`/level/${task.id}?day=${set.date}`}
                  className="flex min-h-24 w-full items-center justify-center rounded-2xl border-[6px] border-sun bg-paper font-display text-4xl font-black [word-spacing:0.12em] text-navy hover:bg-[#fff6d4] sm:text-5xl lg:min-h-32 lg:text-7xl"
                >
                  Task {i + 1}
                </Link>
              </li>
            ))}
          </ol>
        )}
        {loaded && !failed && (!set || set.tasks.length === 0) && <p className="mt-10 text-2xl">No tasks yet. Please come back soon.</p>}
        {failed && <p role="alert" className="mt-10 text-2xl">We couldn’t load today’s tasks. Please try again in a moment.</p>}
      </div>

      <Modal open={later !== null} labelledBy={laterId} onClose={() => setLater(null)}>
        <h2 id={laterId} className="font-display text-3xl font-extrabold">{later}</h2>
        <p className="mt-3">This is coming later.</p>
        <Button className="mt-6 w-full" onClick={() => setLater(null)}>Close</Button>
      </Modal>
    </main>
  )
}
