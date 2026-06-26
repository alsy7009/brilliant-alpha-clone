// AI client (Phase 2). Calls a Firebase Cloud Function ("aiChat") that proxies OpenAI,
// so the OpenAI key stays server-side and never ships to the browser.
import { httpsCallable } from 'firebase/functions'
import { functions, isFirebaseConfigured } from './firebase'

export const TUTOR_NAME = 'Bolt'

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** AI is available when Firebase is configured (the key lives in the Cloud Function). */
export function isAiEnabled(): boolean {
  return isFirebaseConfigured
}

async function callOpenAI(
  messages: ChatMsg[],
  opts?: { temperature?: number; json?: boolean },
): Promise<string> {
  if (!functions) throw new Error('AI is not available.')
  const aiChat = httpsCallable<
    { messages: ChatMsg[]; temperature?: number; json?: boolean },
    { content: string }
  >(functions, 'aiChat')
  const res = await aiChat({ messages, temperature: opts?.temperature, json: opts?.json })
  return res.data.content ?? ''
}

export interface TutorContext {
  instruction: string
  expression?: string
  answerSummary: string
  wrongSummary: string
}

/** Socratic tutor reply — never gives the final answer. */
export async function askTutor(
  history: ChatMsg[],
  ctx: TutorContext,
  userMessage: string,
): Promise<string> {
  const system: ChatMsg = {
    role: 'system',
    content: `You are ${TUTOR_NAME}, a friendly, upbeat robot sidekick in a kids' algebra game called Algebra Quest. You help middle-school learners (around ages 11-14) who are stuck on a problem.

Personality: encouraging, a little playful with light gamer energy (you call them "champ" or "hero" occasionally), and patient. Keep replies SHORT — 1 to 3 sentences.

Hard rules:
- NEVER give the final answer or the exact numbers/values. Guide with Socratic questions and hints only.
- Use the specific context below about THIS problem and what the learner did wrong, so your hint is tailored — not generic.
- If they're really close, point to the one thing to fix without stating the value.
- Stay strictly on this math problem.

Current problem: ${ctx.instruction}
${ctx.expression ? `Math: ${ctx.expression}` : ''}
Learner's current answer: ${ctx.answerSummary}
What's off: ${ctx.wrongSummary}`,
  }
  return callOpenAI([system, ...history, { role: 'user', content: userMessage }], {
    temperature: 0.6,
  })
}

/** An opening, context-aware nudge from the tutor when the chat is first opened. */
export async function tutorOpener(ctx: TutorContext): Promise<string> {
  return askTutor(
    [],
    ctx,
    "I'm stuck on this one. Give me a hint to get started, but don't tell me the answer.",
  )
}
