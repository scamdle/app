import type { CollectionConfig } from 'payload'

import { REGIONS } from '@/lib/regions'

// Anonymous answers from the after-game form. Only the submitFeedback server action writes
// here (through the local API), so the public REST and GraphQL endpoints can't create or read.
export const Feedback: CollectionConfig = {
  slug: 'feedback',
  labels: { singular: 'Feedback', plural: 'Feedback' },
  admin: {
    useAsTitle: 'day',
    defaultColumns: ['day', 'ageGroup', 'percent', 'scenario', 'createdAt'],
    description: 'Anonymous answers from players. No names, emails or IP addresses are stored.',
  },
  access: {
    create: () => false,
    read: ({ req: { user } }) => Boolean(user),
    update: () => false,
    delete: ({ req: { user } }) => Boolean(user),
  },
  indexes: [{ fields: ['deviceId', 'day'], unique: true }],
  fields: [
    { name: 'day', type: 'text', required: true, index: true },
    { name: 'region', type: 'select', options: [...REGIONS] },
    { name: 'scenario', type: 'relationship', relationTo: 'scenarios' },
    { name: 'percent', type: 'number', min: 0, max: 100, admin: { description: 'Score on the scenario, worked out by the server.' } },
    { name: 'ageGroup', type: 'text', required: true },
    { name: 'answers', type: 'json', required: true, admin: { description: 'Question key → answer from 1 to 5.' } },
    { name: 'comment', type: 'textarea' },
    {
      name: 'deviceId',
      type: 'text',
      required: true,
      admin: { description: 'A random id kept on the player’s device, so one person’s days can be linked without knowing who they are.' },
    },
  ],
}
