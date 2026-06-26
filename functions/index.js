const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')

const MODEL = 'gpt-4o-mini'
const MAX_TOKENS = 500

/**
 * Proxies an OpenAI chat completion. The OpenAI key is a server-side secret and never
 * reaches the browser. Requires the caller to be signed in.
 */
exports.aiChat = onCall(
  { secrets: [OPENAI_API_KEY], cors: true, region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to use the tutor.')
    }

    const { messages, temperature, json } = request.data || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError('invalid-argument', 'messages must be a non-empty array.')
    }
    // Basic guardrail: cap conversation size to control cost.
    if (messages.length > 40) {
      throw new HttpsError('invalid-argument', 'Conversation too long.')
    }

    let res
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY.value()}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: typeof temperature === 'number' ? temperature : 0.6,
          max_tokens: MAX_TOKENS,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      })
    } catch (err) {
      throw new HttpsError('unavailable', 'Could not reach the AI service.')
    }

    if (!res.ok) {
      throw new HttpsError('internal', `AI service error (${res.status}).`)
    }

    const data = await res.json()
    const content = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : ''
    return { content: content || '' }
  },
)
