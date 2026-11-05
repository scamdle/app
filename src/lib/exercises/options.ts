export const FORMATS = [
  { label: 'Spot the red flags', value: 'spot-red-flags' },
  { label: 'Real or fake', value: 'real-or-fake' },
  { label: 'Side by side', value: 'side-by-side' },
  { label: 'What would you do next?', value: 'what-next' },
] as const

export const MEDIA = [
  { label: 'Email', value: 'email' },
  { label: 'Text message', value: 'message' },
  { label: 'Link', value: 'link' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
] as const

export const PLATFORMS = [
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Messenger', value: 'messenger' },
] as const

export const DOT_SIZES = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
] as const

export type Format = (typeof FORMATS)[number]['value']
export type Medium = (typeof MEDIA)[number]['value']
export type Platform = (typeof PLATFORMS)[number]['value']
export type DotSize = (typeof DOT_SIZES)[number]['value']

// Which media each format can use. The admin form and the publish check both read this.
export const FORMAT_MEDIA: Record<Format, readonly Medium[]> = {
  'spot-red-flags': ['email', 'message', 'link', 'image'],
  'real-or-fake': ['video', 'link', 'image'],
  'side-by-side': ['image', 'video'],
  'what-next': ['email', 'message'],
}
