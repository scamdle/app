const POINTS = '12 2.5 14.9 8.6 21.6 9.5 16.7 14.1 18 20.8 12 17.5 6 20.8 7.3 14.1 2.4 9.5 9.1 8.6'

export function Stars({ count, size = 40, emptyClass = 'text-mist', edged = false, gapClass = 'gap-1.5' }: {
  count: number
  size?: number
  emptyClass?: string
  // Yellow needs a dark edge to stand out on white.
  edged?: boolean
  gapClass?: string
}) {
  return (
    <span role="img" aria-label={`${count} of 3 stars`} className={`inline-flex ${gapClass}`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={i < count ? 'text-sun' : emptyClass}>
          <polygon
            points={POINTS}
            fill={i < count ? 'currentColor' : 'none'}
            stroke={edged && i < count ? 'var(--color-ink)' : 'currentColor'}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}
