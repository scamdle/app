'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Uses the browser's own dialog, which handles focus and screen readers for us.
export function Modal({ open, labelledBy, onClose, children }: {
  open: boolean
  labelledBy: string
  onClose?: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
      className="on-paper m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border-4 border-sun bg-paper p-6 text-ink sm:p-8"
    >
      {children}
    </dialog>
  )
}
