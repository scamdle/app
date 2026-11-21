import { LinkFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { FieldAccess, GroupField, RichTextField, SelectField } from 'payload'

import { PLATFORMS } from '@/lib/exercises/options'

// /api is public, so everything that gives an answer away is for logged-in editors only.
export const editorsOnly: { read: FieldAccess } = { read: ({ req: { user } }) => Boolean(user) }

type Condition = NonNullable<NonNullable<GroupField['admin']>['condition']>

export const emailGroup = (condition: Condition): GroupField => ({
  name: 'email',
  type: 'group',
  admin: { condition },
  fields: [
    { name: 'fromName', type: 'text' },
    { name: 'fromAddress', type: 'text' },
    { name: 'subject', type: 'text' },
    { name: 'body', type: 'textarea' },
  ],
})

export const messageGroup = (condition: Condition, smsOnly?: (data: Record<string, unknown>) => boolean): GroupField => ({
  name: 'message',
  type: 'group',
  admin: { condition },
  fields: [
    {
      name: 'platform',
      type: 'select',
      options: [...PLATFORMS],
      filterOptions: ({ data, options }) =>
        smsOnly?.(data) ? options.filter((o) => (typeof o === 'string' ? o : o.value) === 'sms') : options,
    },
    { name: 'sender', type: 'text', admin: { description: 'The name or number shown at the top of the chat.' } },
    {
      name: 'bubbles',
      type: 'array',
      labels: { singular: 'Message', plural: 'Messages' },
      fields: [{ name: 'text', type: 'textarea', required: true }],
    },
  ],
})

// This goes to players as-is, and linked or embedded documents would come along in full,
// answers included. So it only allows plain formatting and external links.
export const explanationField = (description = 'Optional lesson shown with the results.'): RichTextField => ({
  name: 'explanation',
  type: 'richText',
  access: editorsOnly,
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter((feature) => !['relationship', 'upload', 'link'].includes(feature.key)),
      LinkFeature({ enabledCollections: [] }),
    ],
  }),
  admin: { description },
})

export const statusField: SelectField = {
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
}
