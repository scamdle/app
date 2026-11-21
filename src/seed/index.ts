// Fills a development database with fictional samples: one per exercise format and medium
// (3-task mode), four scenarios (scenario mode), and today's daily set for both modes.
// Run with `npm run seed`. Samples are titled "[Sample] ..." and replaced on each run.
import config from '@payload-config'
import { getPayload } from 'payload'

import { dayKey } from '@/lib/dayKey'
import { DEFAULT_REGION } from '@/lib/regions'
import type { Exercise, Scenario } from '@/payload-types'

const PREFIX = '[Sample] '

// This publishes samples and replaces today's daily set, so it must never touch production.
// Naming the host in .env is a deliberate step that can't happen by accident.
const host = new URL(process.env.DATABASE_URL ?? 'postgres://unknown').hostname
if (process.env.VERCEL || process.env.SEED_DATABASE_HOST !== host) {
  throw new Error(`To seed this database, first check it is your own Neon branch, then add to .env: SEED_DATABASE_HOST=${host}`)
}

const payload = await getPayload({ config })

const samples = await payload.find({ collection: 'exercises', where: { title: { like: PREFIX } }, limit: 100, depth: 0 })
const sampleScenarios = await payload.find({ collection: 'scenarios', where: { title: { like: PREFIX } }, limit: 100, depth: 0 })
await payload.delete({
  collection: 'daily-sets',
  where: {
    or: [
      { exercises: { in: samples.docs.map((d) => d.id) } },
      { scenario: { in: sampleScenarios.docs.map((d) => d.id) } },
    ],
  },
})
await payload.delete({ collection: 'exercises', where: { title: { like: PREFIX } } })
await payload.delete({ collection: 'scenarios', where: { title: { like: PREFIX } } })
// Image samples from older seeds.
await payload.delete({ collection: 'media', where: { alt: { like: 'Sample:' } } })

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
    title: 'Real or fake link?',
    description: 'Anna’s real bank is Lumo Bank.',
    format: 'real-or-fake',
    medium: 'link',
    link: { context: 'On the back of Anna’s bank card', url: 'https://lumobank.com/help' },
    verdict: 'real',
    answerReason: 'lumobank.com comes right before the first “/”, and it’s printed on her own card.',
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

type ScenarioSample = Omit<Scenario, 'id' | 'updatedAt' | 'createdAt' | 'status' | 'region' | 'title'> & { title: string }

const scenarios: ScenarioSample[] = [
  {
    title: 'A message from the bank',
    description: 'Anna got this email from “her bank” this morning.',
    medium: 'email',
    email,
    verdict: 'fake',
    verdictReason: 'The address only looks like Lumo Bank’s, it rushes her, and it asks for her PIN. No real bank ever does that.',
    maxWrongGuesses: 3,
    flags: [
      { text: 'lumobank-veilig.com', reason: 'This is not the bank’s real address, even though the name is in it.' },
      { text: 'within 24 hours', reason: 'Scammers rush you so you don’t stop and think.' },
      { text: 'Dear customer', reason: 'Your bank knows your name.' },
      { text: 'card PIN', reason: 'No real bank ever asks for your PIN.' },
    ],
    nextPrompt: 'What should Anna do next?',
    nextOptions: [
      { text: 'Call Lumo Bank on the number on her card', isCorrect: true, explanation: 'She checks using a number she already trusts.' },
      { text: 'Delete the email', isCorrect: true, explanation: 'Nothing is lost: a real problem would reach her another way.' },
      { text: 'Click the link to check', isCorrect: false, explanation: 'The link goes to the scammer’s page.' },
      { text: 'Reply with her PIN', isCorrect: false, explanation: 'Never share your PIN with anyone.' },
    ],
  },
  {
    title: 'A login code',
    description: 'Anna is logging in to her online bank on her computer. A moment later this text arrives.',
    medium: 'message',
    message: {
      platform: 'sms',
      sender: 'Lumo Bank',
      bubbles: [{ text: 'Your Lumo Bank login code is 482913. Never share this code with anyone, not even with us.' }],
    },
    verdict: 'real',
    verdictReason: 'Anna asked for this code herself a moment ago, and the text asks for nothing: no link, no call, no reply.',
    whyReal: [
      { text: 'Anna asked for a code herself just now', isCorrect: true, explanation: 'It arrived because of something she did, which a scammer can’t fake.' },
      { text: 'It doesn’t ask her to click, call or reply', isCorrect: true, explanation: 'It just gives information. Scams always want you to do something.' },
      { text: 'The sender is “Lumo Bank”, not a phone number', isCorrect: false, explanation: 'Sender names can be faked, so this proves nothing on its own.' },
      { text: 'It looks professional', isCorrect: false, explanation: 'Scammers can make messages look just as neat.' },
    ],
    nextPrompt: 'What should Anna do with the code?',
    nextOptions: [
      { text: 'Type it into the bank website she opened herself', isCorrect: true, explanation: 'That is what the code is for.' },
      { text: 'Read it out to a caller who says he is from the bank', isCorrect: false, explanation: 'Never: with the code, the caller can log in as Anna.' },
      { text: 'Forward it to her son to be safe', isCorrect: false, explanation: 'The code should stay with her. Nobody else needs it.' },
    ],
  },
  {
    title: 'A bargain on Facebook',
    description: 'Anna is scrolling Facebook and sees this ad. She does need new winter boots.',
    medium: 'ad',
    ad: {
      platform: 'facebook',
      pageName: 'Nordic Shoe Outlet',
      text: 'Closing down sale! All winter boots -80%. Last day today, only a few pairs left!',
      headline: 'Leather winter boots from 19,99 €',
      displayUrl: 'nordic-shoes-outlet.shop',
      buttonText: 'Shop now',
    },
    landing: {
      url: 'https://nordic-shoes-outlet.shop/sale',
      siteName: 'Nordic Shoe Outlet',
      headline: 'Closing down! -80% on everything',
      body: 'Leather winter boots: 19,99 € (was 129,99 €)\nOnly 2 left in your size!\nOffer ends in 09:59\nPayment by bank transfer only',
      buttonText: 'Pay now',
    },
    verdict: 'fake',
    verdictReason: 'Prices this low, a ticking clock and “bank transfer only” are classic signs of a fake shop. Money sent by bank transfer is very hard to get back.',
    maxWrongGuesses: 3,
    flags: [
      { text: '-80%', reason: 'A price far below every other shop is too good to be true.' },
      { text: 'Only 2 left', reason: 'Made-up shortage to make you hurry.' },
      { text: 'Offer ends in', reason: 'A countdown leaves you no time to check the shop.' },
      { text: 'bank transfer only', reason: 'Real shops offer card or PayPal, which protect the buyer.' },
    ],
    nextPrompt: 'How can Anna check this shop before she pays?',
    nextOptions: [
      { text: 'Search the shop’s name with the word “reviews”, e.g. on Trustpilot', isCorrect: true, explanation: 'Other buyers often warn about fake shops.' },
      { text: 'Look for a real address, phone number and company details', isCorrect: true, explanation: 'Fake shops usually hide who is behind them.' },
      { text: 'Pay quickly before the offer ends', isCorrect: false, explanation: 'The clock is there to stop her checking.' },
      { text: 'Pay by bank transfer because it’s the only option', isCorrect: false, explanation: 'If a shop only takes bank transfer, walk away.' },
    ],
  },
  {
    title: 'Looking for the bank',
    description: 'Anna wants to log in to her online bank, so she searches for it.',
    medium: 'search',
    search: {
      query: 'lumo bank login',
      sponsored: true,
      title: 'Lumo Bank – Log in to your online bank',
      displayUrl: 'https://lumo-bank-login.help',
      snippet: 'Official login page. Log in quickly with your card number and PIN code.',
    },
    landing: {
      url: 'https://lumo-bank-login.help/login',
      siteName: 'Lumo Bank',
      headline: 'Log in to Lumo Bank',
      body: 'Card number: ________\nPIN code: ________\nConfirm your details within 10 minutes or your account will be locked.',
      buttonText: 'Log in',
    },
    verdict: 'fake',
    verdictReason: 'Anyone can pay to appear at the top of a search as “Sponsored”. The address isn’t lumobank.com, and a bank never asks for your PIN online.',
    maxWrongGuesses: 3,
    flags: [
      { text: 'Sponsored', reason: 'Scammers pay to appear above the real bank. Look past the ads.' },
      { text: 'lumo-bank-login.help', reason: 'The bank’s real address is lumobank.com.' },
      { text: 'PIN code', reason: 'A bank never asks for your PIN on a website.' },
      { text: 'within 10 minutes', reason: 'Threats and deadlines are meant to rush you.' },
    ],
    nextPrompt: 'How should Anna get to her bank safely?',
    nextOptions: [
      { text: 'Type lumobank.com herself, or use a saved bookmark', isCorrect: true, explanation: 'Then she always lands on the real site.' },
      { text: 'Scroll past the “Sponsored” results to the bank’s own site', isCorrect: true, explanation: 'The real bank is usually the first result that isn’t an ad.' },
      { text: 'Enter her card number to see if the page works', isCorrect: false, explanation: 'The scammer gets her details the moment she types them.' },
    ],
  },
]

const scenarioIds: { id: number; title: string }[] = []
for (const { title, ...sample } of scenarios) {
  const created = await payload.create({
    collection: 'scenarios',
    data: { ...sample, title: `${PREFIX}${title}`, region: DEFAULT_REGION, status: 'published' },
  })
  scenarioIds.push({ id: created.id, title: created.title })
}

const date = dayKey(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
await payload.delete({ collection: 'daily-sets', where: { date: { equals: date }, region: { equals: DEFAULT_REGION } } })
await payload.create({
  collection: 'daily-sets',
  data: { date, region: DEFAULT_REGION, exercises: [ids[0].id, ids[5].id, ids[7].id], scenario: scenarioIds[2].id },
})

for (const { id, title } of ids) payload.logger.info(`/level/${id}  ${title}`)
for (const { id, title } of scenarioIds) payload.logger.info(`/scenario/${id}  ${title}`)
payload.logger.info(`Daily set created for ${date}`)
process.exit(0)
