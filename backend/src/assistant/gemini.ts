import * as v from 'valibot';
import type { Bindings } from '../env';
import { ApiError } from '../lib/errors';
import { ASSISTANT_LINKS } from './knowledge';

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 12_000;

const LINK_VALUES = ['none', ...Object.keys(ASSISTANT_LINKS)] as [string, ...string[]];

/** The model must answer in this shape; anything else is rejected. */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    allowed: { type: 'BOOLEAN', description: 'true only if the question is about AdvanCare (services, prices, plans, requests, using the app).' },
    emergency: { type: 'BOOLEAN', description: 'true if the user describes a possible medical emergency.' },
    reply: { type: 'STRING', description: 'The answer to the user, plain text, at most 120 words.' },
    link: { type: 'STRING', enum: LINK_VALUES, description: 'One app screen that helps, or "none".' },
  },
  required: ['allowed', 'emergency', 'reply', 'link'],
  propertyOrdering: ['allowed', 'emergency', 'reply', 'link'],
} as const;

export const ModelAnswer = v.object({
  allowed: v.boolean(),
  emergency: v.boolean(),
  reply: v.pipe(v.string(), v.maxLength(4000)),
  link: v.picklist(LINK_VALUES),
});
export type ModelAnswer = v.InferOutput<typeof ModelAnswer>;

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

class RetryableError extends Error {}

/**
 * Calls Gemini with structured JSON output. Tries GEMINI_MODEL, then GEMINI_FALLBACK_MODEL
 * when the first is rate-limited, overloaded, unreachable or times out.
 * The API key travels in a header (never the URL) and provider errors are never surfaced.
 */
export async function askGemini(env: Bindings, system: string, turns: Turn[]): Promise<{ answer: ModelAnswer; model: string; fellBack: boolean }> {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) throw new ApiError(503, 'ASSISTANT_UNCONFIGURED', 'The care assistant is not available right now.');

  const primary = env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fallback = env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
  const models = primary === fallback ? [primary] : [primary, fallback];

  for (const [i, model] of models.entries()) {
    try {
      return { answer: await callModel(key, model, system, turns), model, fellBack: i > 0 };
    } catch (err) {
      // Only known failure categories/statuses: never provider bodies, keys or conversations.
      const message = err instanceof Error ? err.message : '';
      const reason = /^(?:[1-5][0-9]{2}|location_unsupported|invalid_request|network|unparsable|schema)$/.test(message) ? message : 'unknown';
      console.warn(JSON.stringify({ assistantProvider: { model, reason } }));
      if (!(err instanceof RetryableError) || i === models.length - 1) break;
    }
  }
  throw new ApiError(502, 'ASSISTANT_FAILED', 'The care assistant could not answer right now. Please try again.');
}

async function callModel(key: string, model: string, system: string, turns: Turn[]): Promise<ModelAnswer> {
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] })),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } catch {
    throw new RetryableError('network');
  }
  if (res.status === 429 || res.status >= 500) throw new RetryableError(String(res.status));
  if (res.status === 400 || res.status === 404) {
    // Model/region availability can differ; allow the configured fallback model.
    const error = await res.json().catch(() => null) as { error?: { message?: string } } | null;
    const message = error?.error?.message ?? '';
    throw new RetryableError(/location.*not supported/i.test(message) ? 'location_unsupported' : String(res.status));
  }
  if (!res.ok) throw new Error(String(res.status));

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  } | null;
  // Blocked by Google's safety filters: answer with the off-topic refusal rather than an error.
  if (data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason === 'SAFETY') {
    return { allowed: false, emergency: false, reply: '', link: 'none' };
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('unparsable');
  }
  const result = v.safeParse(ModelAnswer, parsed);
  if (!result.success) throw new Error('schema');
  return result.output;
}
