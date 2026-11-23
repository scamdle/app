import type { GlobalConfig } from 'payload'

import { DEFAULT_AGE_GROUPS, DEFAULT_QUESTIONS } from '@/lib/feedback'
import { GAME_MODES } from '@/lib/exercises/options'

export const GameSettings: GlobalConfig = {
  slug: 'game-settings',
  admin: { description: 'Switches that change the game for every player.' },
  access: {
    // Nothing here is secret: the mode and the feedback questions are shown to players anyway.
    read: () => true,
    update: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Game',
          fields: [
            {
              name: 'mode',
              type: 'select',
              required: true,
              defaultValue: 'three-tasks',
              options: [...GAME_MODES],
              admin: {
                description:
                  '3 separate tasks: each daily set uses its 3 Exercises. 1 scenario in 3 steps: each daily set uses its Scenario (real or fake, back it up, what next).',
              },
            },
            {
              name: 'showAllScenarios',
              type: 'checkbox',
              defaultValue: false,
              label: 'Testing: list every published scenario on the home screen',
              admin: {
                condition: (data) => data?.mode === 'scenario',
                description: 'So testers can play any scenario without changing the daily set. Turn it off before real players arrive.',
              },
            },
          ],
        },
        {
          label: 'Feedback form',
          description: 'Asked after the daily scenario (scenario mode only). Answers are anonymous and saved in Feedback.',
          fields: [
            { name: 'feedbackEnabled', type: 'checkbox', defaultValue: true, label: 'Show the feedback form' },
            {
              name: 'feedbackRequired',
              type: 'checkbox',
              defaultValue: true,
              label: 'Players must answer before going back home',
              admin: { description: 'On for user testing. Turn it off later and players get a Skip button.' },
            },
            {
              name: 'ageGroups',
              type: 'array',
              labels: { singular: 'Age group', plural: 'Age groups' },
              defaultValue: DEFAULT_AGE_GROUPS,
              admin: { description: 'Asked first. Changing a value later splits old and new answers apart, so prefer editing labels.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'value', type: 'text', required: true, admin: { description: 'Saved with each answer, e.g. 65-74.' } },
                  ],
                },
              ],
            },
            {
              name: 'questions',
              type: 'array',
              labels: { singular: 'Question', plural: 'Questions' },
              defaultValue: DEFAULT_QUESTIONS,
              admin: { description: 'Scale questions are answered 1 to 5. A comment question is optional free text; only the first one is used.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'key', type: 'text', required: true, admin: { description: 'Short id saved with answers, e.g. confidence. Keep it when rewording.' } },
                    {
                      name: 'type',
                      type: 'select',
                      required: true,
                      defaultValue: 'scale',
                      options: [
                        { label: 'Scale 1–5', value: 'scale' },
                        { label: 'Comment (optional)', value: 'comment' },
                      ],
                    },
                  ],
                },
                { name: 'text', type: 'text', required: true },
                {
                  type: 'row',
                  admin: { condition: (_, sibling) => sibling?.type === 'scale' },
                  fields: [
                    { name: 'lowLabel', type: 'text', admin: { description: 'Shown under 1' } },
                    { name: 'highLabel', type: 'text', admin: { description: 'Shown under 5' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
