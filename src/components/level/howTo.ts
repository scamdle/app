import type { Playable } from '@/lib/exercises/types'

export function howToPlay(exercise: Playable): string {
  switch (exercise.format) {
    case 'spot-text':
      return `Find ${exercise.flagCount} red ${exercise.flagCount === 1 ? 'flag' : 'flags'}. Tap each sentence or web address that looks suspicious. You can make ${exercise.maxWrong} wrong ${exercise.maxWrong === 1 ? 'guess' : 'guesses'}.`
    case 'real-or-fake':
      return 'Look closely, then decide: is this real or fake?'
    case 'what-next':
      return 'Read the message and the situation, then tick every action that is right. You get one Check.'
  }
}
