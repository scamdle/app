import type { ButtonHTMLAttributes } from 'react'

const STYLES = {
  primary: 'bg-sun text-ink border-sun hover:brightness-105',
  plain: 'bg-paper text-ink border-ink hover:bg-mist/40',
}

export function Button({ look = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { look?: keyof typeof STYLES }) {
  return (
    <button
      type="button"
      className={`min-h-14 cursor-pointer rounded-xl border-3 px-6 py-2 text-xl font-bold disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[look]} ${className}`}
      {...props}
    />
  )
}
