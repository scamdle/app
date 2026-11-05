import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    // The storage plugin only adds this when a Blob token exists. Declaring it here too keeps the
    // database the same with or without a token, so migrations never add or drop it by accident.
    {
      name: '_objectKey',
      type: 'text',
      admin: { hidden: true, readOnly: true },
    },
  ],
  upload: true,
}
