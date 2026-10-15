import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import * as v from 'valibot';
import { caregiverAvailability, ownShiftSummaries } from '../assistant/context';
import { askGemini } from '../assistant/gemini';
import { cleanInput, EMERGENCY_REPLY, finalizeReply, OFF_TOPIC_REPLY } from '../assistant/guard';
import { ASSISTANT_LINKS, type AssistantLink } from '../assistant/knowledge';
import { buildSystemPrompt } from '../assistant/prompt';
import { connectDb } from '../db/client';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { validate } from '../lib/validation';
import { authenticatedUserId } from '../middleware/auth';

const MAX_TURNS = 12;
const MAX_MESSAGE_CHARS = 500;

export const ChatRequest = v.strictObject({
  messages: v.pipe(
    v.array(
      v.strictObject({
        role: v.picklist(['user', 'assistant']),
        text: v.pipe(v.string(), v.transform(cleanInput), v.minLength(1, 'Message is empty.'), v.maxLength(MAX_MESSAGE_CHARS, `Keep messages under ${MAX_MESSAGE_CHARS} characters.`)),
      }),
    ),
    v.minLength(1),
    v.maxLength(MAX_TURNS, `Send at most ${MAX_TURNS} messages of history.`),
    v.check((m) => m[m.length - 1]?.role === 'user', 'The last message must be from the user.'),
  ),
});

export const assistant = new Hono<AppEnv>();

assistant.post(
  '/assistant/chat',
  bodyLimit({
    maxSize: 16 * 1024,
    onError: () => {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'That message is too long.');
    },
  }),
  validate('json', ChatRequest),
  async (c) => {
    // Per-caller limit protects the shared Gemini quota. CF-Connecting-IP is set by Cloudflare's edge.
    const userId = await authenticatedUserId(c);
    const caller = userId ?? c.req.header('CF-Connecting-IP') ?? 'local';
    if (c.env.ASSISTANT_LIMITER) {
      const { success } = await c.env.ASSISTANT_LIMITER.limit({ key: `assistant:${caller}` });
      if (!success) throw new ApiError(429, 'RATE_LIMITED', 'You are sending messages too quickly. Please wait a minute and try again.');
    }

    const { messages } = c.req.valid('json');
    const system = buildSystemPrompt({
      ...(await loadContext(c.env, userId)),
      today: new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full' }),
    });
    const { answer, model, fellBack } = await askGemini(c.env, system, messages);

    // Metadata only — conversation text is never logged.
    console.log(JSON.stringify({ requestId: c.get('requestId'), assistant: { model, fellBack, allowed: answer.allowed, emergency: answer.emergency, turns: messages.length } }));

    if (answer.emergency) return c.json({ reply: EMERGENCY_REPLY, link: null, emergency: true, allowed: true });
    if (!answer.allowed || !answer.reply.trim()) return c.json({ reply: OFF_TOPIC_REPLY, link: null, emergency: false, allowed: false });

    const link = answer.link !== 'none' ? { to: answer.link, label: ASSISTANT_LINKS[answer.link as AssistantLink] } : null;
    return c.json({ reply: finalizeReply(answer.reply), link, emergency: false, allowed: true });
  },
);

/** Reference data for the prompt. Database failures degrade to "unavailable", never to an error. */
async function loadContext(env: AppEnv['Bindings'], userId: string | null) {
  const signedOut =
    'The user is not signed in to the server, so you cannot see their requests. For the status of their own requests, point them to "Your requests" (link /requests), which shows what is saved on their phone.';
  const unavailable = 'Live availability is not available right now.';
  const client = await connectDb(env).catch(() => null);
  if (!client) return { liveAvailability: unavailable, userRecords: userId ? 'The user’s records could not be loaded right now.' : signedOut };
  try {
    const [liveAvailability, userRecords] = await Promise.all([
      caregiverAvailability(client.db).catch(() => unavailable),
      userId ? ownShiftSummaries(client.db, userId).catch(() => 'The user’s records could not be loaded right now.') : Promise.resolve(signedOut),
    ]);
    return { liveAvailability, userRecords };
  } finally {
    await client.close();
  }
}
