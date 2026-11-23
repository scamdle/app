import config from '@payload-config'
import { getPayload } from 'payload'

import type { GameMode } from './exercises/options'
import { DEFAULT_AGE_GROUPS, DEFAULT_QUESTIONS, type FeedbackForm, type FeedbackQuestion } from './feedback'

export type GameSettingsView = { mode: GameMode; showAllScenarios: boolean; feedback: FeedbackForm | null }

// Server only. Empty lists fall back to the starter form, so the game never shows a blank one.
export async function getGameSettings(): Promise<GameSettingsView> {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'game-settings', depth: 0 })
  const ageGroups = (settings.ageGroups ?? []).map(({ label, value }) => ({ label, value }))
  const questions = (settings.questions ?? []).map(
    ({ key, text, type, lowLabel, highLabel }): FeedbackQuestion => ({ key, text, type, lowLabel, highLabel }),
  )
  return {
    mode: settings.mode === 'scenario' ? 'scenario' : 'three-tasks',
    showAllScenarios: settings.showAllScenarios === true,
    feedback:
      settings.feedbackEnabled === false
        ? null
        : {
            required: settings.feedbackRequired !== false,
            ageGroups: ageGroups.length ? ageGroups : DEFAULT_AGE_GROUPS,
            questions: questions.length ? questions : DEFAULT_QUESTIONS,
          },
  }
}
