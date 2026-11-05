import type { Playable } from '@/lib/exercises/types'

export function howToPlay(exercise: Playable): string {
  switch (exercise.format) {
    case 'spot-text':
      return `Find ${exercise.flagCount} red ${exercise.flagCount === 1 ? 'flag' : 'flags'}. Tap anything that looks suspicious. You can make ${exercise.maxWrong} wrong ${exercise.maxWrong === 1 ? 'guess' : 'guesses'}.`
    case 'spot-image':
      return `Find ${exercise.dotCount} suspicious ${exercise.dotCount === 1 ? 'spot' : 'spots'}. Drag each circle onto one, or tap a circle and then tap the picture. Press Check when they're all placed. You get 3 Checks.`
    case 'real-or-fake':
      return 'Look closely, then decide: is this real or fake?'
    case 'side-by-side':
      return 'One is real and one is fake. Compare them, then choose the real one.'
    case 'what-next':
      return 'Read the message and the situation, then tick every action that is right. You get one Check.'
  }
}
