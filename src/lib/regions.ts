// Add a country here and it appears in the admin; a migration adds it to the database enums.
export const REGIONS = [
  { label: 'All regions', value: 'all' },
  { label: 'Estonia', value: 'ee' },
  { label: 'Netherlands', value: 'nl' },
  { label: 'Germany', value: 'de' },
  { label: 'Portugal', value: 'pt' },
  { label: 'Belgium', value: 'be' },
] as const

export type Region = (typeof REGIONS)[number]['value']

// There's no region picker yet, so everyone plays this one.
export const DEFAULT_REGION: Region = 'all'
