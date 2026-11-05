// Fills a development database with one fictional sample per format and medium, plus today's
// daily set. Run with `npm run seed`. Samples are titled "[Sample] ..." and replaced on each run.
import config from '@payload-config'
import { getPayload } from 'payload'
import sharp from 'sharp'

import { dayKey } from '@/lib/dayKey'
import { DEFAULT_REGION } from '@/lib/regions'
import type { Exercise } from '@/payload-types'

const PREFIX = '[Sample] '
const VIDEO_A = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
const VIDEO_B = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4'

// This publishes samples and replaces today's daily set, so it must never touch production.
// Naming the host in .env is a deliberate step that can't happen by accident.
const host = new URL(process.env.DATABASE_URL ?? 'postgres://unknown').hostname
if (process.env.VERCEL || process.env.SEED_DATABASE_HOST !== host) {
  throw new Error(`To seed this database, first check it is your own Neon branch, then add to .env: SEED_DATABASE_HOST=${host}`)
}

const payload = await getPayload({ config })

async function uploadSvg(name: string, alt: string, svg: string): Promise<number> {
  const data = await sharp(Buffer.from(svg)).png().toBuffer()
  const media = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype: 'image/png', name: `${name}.png`, size: data.length },
  })
  return media.id
}

const loginScreen = (address: string, button: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <rect width="1200" height="800" fill="#e8eef5"/>
  <rect x="60" y="40" width="1080" height="70" rx="14" fill="#ffffff"/>
  <text x="90" y="88" font-family="Arial" font-size="32" fill="#333333">${address}</text>
  <text x="600" y="210" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="64" fill="#14507a">Lumo Bank</text>
  <rect x="300" y="280" width="600" height="70" rx="8" fill="#ffffff" stroke="#999999"/>
  <text x="320" y="326" font-family="Arial" font-size="30" fill="#777777">Enter your card number</text>
  <rect x="300" y="380" width="600" height="70" rx="8" fill="#ffffff" stroke="#999999"/>
  <text x="320" y="426" font-family="Arial" font-size="30" fill="#777777">Enter your PIN code</text>
  <rect x="300" y="490" width="600" height="84" rx="8" fill="#c4262e"/>
  <text x="600" y="545" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="34" fill="#ffffff">${button}</text>
</svg>`

const samples = await payload.find({ collection: 'exercises', where: { title: { like: PREFIX } }, limit: 100, depth: 0 })
await payload.delete({ collection: 'daily-sets', where: { exercises: { in: samples.docs.map((d) => d.id) } } })
await payload.delete({ collection: 'exercises', where: { title: { like: PREFIX } } })
await payload.delete({ collection: 'media', where: { alt: { like: 'Sample:' } } })

const fakeImage = await uploadSvg(
  'lumo-login-a',
  'Sample: a login page for Lumo Bank',
  loginScreen('lumobank-veilig.com/login', 'LOG IN NOW OR LOSE ACCESS'),
)
const realImage = await uploadSvg('lumo-login-b', 'Sample: a login page for Lumo Bank', loginScreen('lumobank.com/login', 'Log in'))

const email = {
  fromName: 'Lumo Bank Security',
  fromAddress: 'security@lumobank-veilig.com',
  subject: 'URGENT: your account will be closed',
  body: `Dear customer,

We noticed unusual activity on your account. Your account will be closed within 24 hours unless you confirm your details.

Verify here: http://lumobank-veilig.com/verify

Please also reply with your card PIN so we can confirm it is you.

Lumo Bank Security Team`,
}

const sms = {
  platform: 'sms' as const,
  sender: '+372 5550 1234',
  bubbles: [{ text: 'Lumo Bank: a new device logged in to your account. If this was not you, call 0800 555 019 now.' }],
}

type Sample = Omit<Exercise, 'id' | 'updatedAt' | 'createdAt' | 'status' | 'region' | 'title'> & { title: string }

const list: Sample[] = [
  {
    title: 'A worrying email',
    description: 'Anna got this email from her bank this morning.',
    format: 'spot-red-flags',
    medium: 'email',
    email,
    maxWrongGuesses: 3,
    flags: [
      { text: 'lumobank-veilig.com', reason: 'This is not the bank’s real address, even though the name is in it.' },
      { text: 'within 24 hours', reason: 'Scammers rush you so you don’t stop and think.' },
      { text: 'Dear customer', reason: 'Your bank knows your name.' },
      { text: 'card PIN', reason: 'No real bank ever asks for your PIN.' },
    ],
  },
  {
    title: 'A parcel text',
    description: 'Anna got this text. She isn’t expecting a parcel.',
    format: 'spot-red-flags',
    medium: 'message',
    message: {
      platform: 'sms',
      sender: '+372 5550 8877',
      bubbles: [{ text: 'Your parcel is held at customs. Pay the 1,99 € fee today: http://parcel-fee.example/pay' }],
    },
    maxWrongGuesses: 2,
    flags: [
      { text: 'parcel-fee.example', reason: 'A delivery company wouldn’t use a random address like this.' },
      { text: 'fee', reason: 'A small fee is a common way to get your card details.' },
    ],
  },
  {
    title: 'A new number',
    description: 'Anna got this WhatsApp message from a number she doesn’t know.',
    format: 'spot-red-flags',
    medium: 'message',
    message: {
      platform: 'whatsapp',
      sender: '+31 6 5550 2211',
      bubbles: [
        { text: 'Hi Grandma, it’s Max. I lost my phone, this is my new number.' },
        { text: 'I need money urgently for a bill. Can you send 800 € today? Please don’t tell Mum.' },
      ],
    },
    maxWrongGuesses: 3,
    flags: [
      { text: 'new number', reason: 'Check by calling the number you already have for them.' },
      { text: 'urgently', reason: 'Pressure is the scammer’s main tool.' },
      { text: 'don’t tell Mum', reason: 'Keeping it secret stops anyone warning you.' },
    ],
  },
  {
    title: 'A prize from a friend',
    description: 'A friend’s account sent Anna this on Messenger.',
    format: 'spot-red-flags',
    medium: 'message',
    message: {
      platform: 'messenger',
      sender: 'Mari Tamm',
      bubbles: [{ text: 'OMG you won a free phone! Just enter your bank details here: prize-winners.example' }],
    },
    maxWrongGuesses: 3,
    flags: [
      { text: 'won a free phone', reason: 'Anna never entered a competition.' },
      { text: 'bank details', reason: 'A real prize wouldn’t need your bank details.' },
    ],
  },
  {
    title: 'Read the address',
    description: 'This link was in a text that claimed to be from Lumo Bank.',
    format: 'spot-red-flags',
    medium: 'link',
    link: { context: 'In a text from “Lumo Bank”', url: 'https://lumobank.com.secure-login.net/verify' },
    maxWrongGuesses: 3,
    flags: [{ text: 'secure-login.net', reason: 'The real address is what comes right before the first “/”. Here that’s secure-login.net.' }],
  },
  {
    title: 'A strange login page',
    description: 'Anna followed a link and landed on this page.',
    format: 'spot-red-flags',
    medium: 'image',
    image: fakeImage,
    dots: [
      { x: 28, y: 9.5, size: 'large', reason: 'The address isn’t the bank’s real one.' },
      { x: 50, y: 41, size: 'medium', reason: 'A bank’s login page doesn’t ask for your full card number.' },
      { x: 50, y: 66, size: 'medium', reason: 'Threats and capital letters are meant to rush you.' },
    ],
  },
  {
    title: 'Real or fake link?',
    description: 'Anna’s real bank is Lumo Bank.',
    format: 'real-or-fake',
    medium: 'link',
    link: { context: 'On the back of Anna’s bank card', url: 'https://lumobank.com/help' },
    verdict: 'real',
    answerReason: 'lumobank.com comes right before the first “/”, and it’s printed on her own card.',
  },
  {
    title: 'Real or fake page?',
    description: 'Does this page look right?',
    format: 'real-or-fake',
    medium: 'image',
    image: fakeImage,
    verdict: 'fake',
    answerReason: 'The address and the threatening button both give it away.',
  },
  {
    title: 'Real or fake video?',
    description: 'A sample clip, to try the video level.',
    format: 'real-or-fake',
    medium: 'video',
    videoUrl: VIDEO_A,
    verdict: 'real',
    answerReason: 'This sample is a real film clip.',
  },
  {
    title: 'Which page is real?',
    description: 'One of these is Lumo Bank’s real login page.',
    format: 'side-by-side',
    medium: 'image',
    comparison: { realImage, fakeImage },
    answerReason: 'The real page has the bank’s own address and a calm button.',
  },
  {
    title: 'Which clip is real?',
    description: 'Sample clips, to try the side-by-side video level.',
    format: 'side-by-side',
    medium: 'video',
    comparison: { realVideoUrl: VIDEO_A, fakeVideoUrl: VIDEO_B },
    answerReason: 'In this sample, the flower clip counts as the real one.',
  },
  {
    title: 'What would you do? (email)',
    description: 'Anna got this email and feels worried.',
    format: 'what-next',
    medium: 'email',
    email,
    scenario: 'What should Anna do next?',
    options: [
      { text: 'Call Lumo Bank on the number on her card', isCorrect: true, explanation: 'She checks using a number she already trusts.' },
      { text: 'Delete the email', isCorrect: true, explanation: 'Nothing is lost: a real problem would reach her another way.' },
      { text: 'Click the link to check', isCorrect: false, explanation: 'The link goes to the scammer’s page.' },
      { text: 'Reply with her PIN', isCorrect: false, explanation: 'Never share your PIN with anyone.' },
    ],
  },
  {
    title: 'What would you do? (text)',
    description: 'Anna is at home on Tuesday evening when this text arrives.',
    format: 'what-next',
    medium: 'message',
    message: sms,
    scenario: 'Anna hasn’t logged in today. What should she do?',
    options: [
      { text: 'Call the number in the text', isCorrect: false, explanation: 'That number may go straight to the scammer.' },
      { text: 'Call the number on the back of her card', isCorrect: true, explanation: 'That number is one she can trust.' },
      { text: 'Reply “Is this really Lumo Bank?”', isCorrect: false, explanation: 'The scammer will say yes, and now knows her number works.' },
    ],
  },
]

const ids: { id: number; title: string }[] = []
for (const { title, ...sample } of list) {
  const created = await payload.create({
    collection: 'exercises',
    data: { ...sample, title: `${PREFIX}${title}`, region: DEFAULT_REGION, status: 'published' },
  })
  ids.push({ id: created.id, title: created.title })
}

const date = dayKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
await payload.delete({ collection: 'daily-sets', where: { date: { equals: date }, region: { equals: DEFAULT_REGION } } })
await payload.create({
  collection: 'daily-sets',
  data: { date, region: DEFAULT_REGION, exercises: [ids[0].id, ids[5].id, ids[12].id] },
})

for (const { id, title } of ids) payload.logger.info(`/level/${id}  ${title}`)
payload.logger.info(`Daily set created for ${date}`)
process.exit(0)
