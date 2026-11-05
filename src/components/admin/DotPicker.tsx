'use client'

import { FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { useEffect, useState, type CSSProperties } from 'react'

import { DOT_SIZES } from '@/lib/exercises/options'
import { DOT_RADIUS, type Dot } from '@/lib/scoring/imageDots'

const round = (n: number) => Math.round(n * 10) / 10

const css: Record<string, CSSProperties> = {
  frame: { position: 'relative', display: 'block', overflow: 'hidden', width: '100%', maxWidth: 720, cursor: 'crosshair', lineHeight: 0 },
  image: { width: '100%', height: 'auto', display: 'block' },
  row: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 },
  reason: { flex: 1, padding: 8 },
}

// Click the image to place a hidden dot, then set its size and reason.
export const DotPicker: JSONFieldClientComponent = ({ path, field }) => {
  const { value, setValue, showError, errorMessage } = useField<Dot[]>({ path })
  const imageField = useFormFields(([fields]) => fields.image?.value)
  const imageId = typeof imageField === 'object' && imageField ? (imageField as { id: number }).id : imageField
  const [url, setUrl] = useState<string | null>(null)
  const dots = Array.isArray(value) ? value : []

  useEffect(() => {
    let active = true
    if (!imageId) {
      Promise.resolve().then(() => active && setUrl(null))
      return () => { active = false }
    }
    fetch(`/api/media/${imageId}?depth=0`, { credentials: 'include' })
      .then((res) => res.json())
      .then((media) => active && setUrl(media.url ?? null))
      .catch(() => active && setUrl(null))
    return () => { active = false }
  }, [imageId])

  const update = (index: number, patch: Partial<Dot>) =>
    setValue(dots.map((dot, i) => (i === index ? { ...dot, ...patch } : dot)))

  return (
    <div className="field-type" style={{ marginBottom: 24 }}>
      <FieldLabel label={field.label || 'Hidden dots'} path={path} />
      {showError && <p style={{ color: 'var(--theme-error-500)' }}>{errorMessage}</p>}
      {!url ? (
        <p>Upload or choose the image above, then click on it here to place dots.</p>
      ) : (
        <>
          <p>Click the image to add a dot. The ring shows how close a player’s circle must land.</p>
          <div
            style={css.frame}
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect()
              setValue([
                ...dots,
                {
                  x: round(((event.clientX - box.left) / box.width) * 100),
                  y: round(((event.clientY - box.top) / box.height) * 100),
                  size: 'medium',
                  reason: '',
                },
              ])
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={css.image} />
            {dots.map((dot, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  width: `${DOT_RADIUS[dot.size] * 2}%`,
                  aspectRatio: '1',
                  transform: 'translate(-50%, -50%)',
                  border: '3px solid #e11d48',
                  borderRadius: '50%',
                  background: 'rgba(225, 29, 72, 0.2)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  textShadow: '0 0 3px #000',
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>
          {dots.map((dot, i) => (
            <div key={i} style={css.row}>
              <strong>{i + 1}</strong>
              <select
                aria-label={`Dot ${i + 1} size`}
                value={dot.size}
                onChange={(event) => update(i, { size: event.target.value as Dot['size'] })}
                style={{ padding: 8 }}
              >
                {DOT_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Dot ${i + 1} reason`}
                placeholder="Why is this suspicious?"
                value={dot.reason}
                onChange={(event) => update(i, { reason: event.target.value })}
                style={css.reason}
              />
              <button type="button" onClick={() => setValue(dots.filter((_, j) => j !== i))} style={{ padding: 8 }}>
                Remove
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
