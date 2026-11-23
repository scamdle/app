import type { Playable } from '@/lib/exercises/types'

export function howToPlay(exercise: Playable): string {
  switch (exercise.format) {
    case 'spot-text':
      return `Find ${exercise.flagCount} red ${exercise.flagCount === 1 ? 'flag' : 'flags'}. Tap anything that looks suspicious.`
    case 'real-or-fake':
      return 'Look closely, then decide: is this real or fake?'
    case 'what-next':
      return 'Read the message and the situation, then tick every action that is right. You get one Check.'
  }
}
