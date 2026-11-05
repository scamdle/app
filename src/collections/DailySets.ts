import type { CollectionConfig } from 'payload'

import { DEFAULT_REGION, REGIONS } from '@/lib/regions'

export const DailySets: CollectionConfig = {
  slug: 'daily-sets',
  admin: {
    useAsTitle: 'date',
    defaultColumns: ['date', 'region', 'exercises'],
    description: 'Choose the 3 tasks for a date. If a date has no set, players get the most recent earlier one.',
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
      required: true,
      minRows: 3,
      maxRows: 3,
      filterOptions: { status: { equals: 'published' } },
    },
  ],
}
