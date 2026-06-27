// AI client (Phase 2). Calls a Firebase Cloud Function ("aiChat") that proxies OpenAI,
// so the OpenAI key stays server-side and never ships to the browser.
// Used only for generating practice/quiz problems — no back-and-forth chat.
import { httpsCallable } from 'firebase/functions'
import { functions, isFirebaseConfigured } from './firebase'

interface ChatMsg {
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

/**
 * Ask the model for a JSON object. Returns the parsed value, or null if the call
 * fails or the response isn't valid JSON. Callers should have a non-AI fallback.
 */
export async function aiJson(system: string, user: string): Promise<unknown | null> {
  try {
    const text = await callOpenAI(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.85, json: true },
    )
    return JSON.parse(text)
  } catch {
    return null
  }
}
