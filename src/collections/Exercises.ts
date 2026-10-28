import type { CollectionConfig } from 'payload'

// First stub. The real exercise format is agreed in #15 and replaces `content`.
export const Exercises: CollectionConfig = {
  slug: 'exercises',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'format', 'status'],
  },
  access: {
    // Logged-in team members see everything; the public only sees published exercises.
    read: ({ req: { user } }) => (user ? true : { status: { equals: 'published' } }),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Links', value: 'links' },
        { label: 'Messages', value: 'messages' },
        { label: 'Fake screens', value: 'fake-screens' },
        { label: 'AI media', value: 'ai-media' },
      ],
    },
    {
      name: 'format',
      type: 'select',
      required: true,
      options: [
        { label: 'Spot the red flags', value: 'spot-red-flags' },
        { label: 'Real or fake', value: 'real-or-fake' },
        { label: 'What would you do next?', value: 'what-next' },
      ],
    },
    {
      name: 'content',
      type: 'json',
      admin: { description: 'Placeholder until the exercise format is agreed in #15.' },
    },
    {
      name: 'explanation',
      type: 'richText',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'In review', value: 'in-review' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
