import type { CollectionConfig } from 'payload'

import { DEFAULT_REGION, REGIONS } from '@/lib/regions'

export const DailySets: CollectionConfig = {
  slug: 'daily-sets',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'region', 'exercises'],
    description:
      'Choose what players get on a date: 3 Exercises for 3-task mode, a Scenario for scenario mode, or both so either mode works. If a date has no set, players get the most recent earlier one.',
  },
  access: {
    // Players get today's set through the home screen, so upcoming sets stay private.
    read: ({ req: { user } }) => Boolean(user),
  },
  indexes: [{ fields: ['date', 'region'], unique: true }],
  fields: [
    {
      name: 'date',
      type: 'text',
      required: true,
      admin: { description: 'As YYYY-MM-DD, e.g. 2026-11-20.' },
      validate: (value: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? true : 'Use the format YYYY-MM-DD.'),
    },
    { name: 'region', type: 'select', required: true, defaultValue: DEFAULT_REGION, options: [...REGIONS] },
    {
      name: 'exercises',
      type: 'relationship',
      relationTo: 'exercises',
      hasMany: true,
      filterOptions: { status: { equals: 'published' } },
      admin: { description: 'For 3-task mode: exactly 3.' },
      validate: (value: unknown) => {
        const count = Array.isArray(value) ? value.length : 0
        return count === 0 || count === 3 ? true : 'Choose exactly 3 exercises, or none.'
      },
    },
    {
      name: 'scenario',
      type: 'relationship',
      relationTo: 'scenarios',
      filterOptions: { status: { equals: 'published' } },
      admin: { description: 'For scenario mode.' },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) => {
        const exercises = Array.isArray(siblingData?.exercises) ? siblingData.exercises.length : 0
        return value || exercises > 0 ? true : 'Choose a scenario or 3 exercises.'
      },
    },
  ],
}
