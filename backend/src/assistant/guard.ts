/**
 * Deterministic safety layer around the model. The model is never trusted to enforce
 * these rules alone: refusals and emergency text are written here, not by the model,
 * and every reply is scrubbed before it leaves the API.
 */

export const OFF_TOPIC_REPLY =
  'I can only help with AdvanCare: our services and prices, care plans, your requests, and how to use the app. What would you like to know about those?';

export const EMERGENCY_REPLY =
  'If this may be an emergency, call 911 or go to the nearest hospital now. AdvanCare is for scheduled care and cannot respond to emergencies.';

export const MAX_REPLY_CHARS = 1200;

/** Strips control characters (keeps newlines) and collapses runs of whitespace. */
export function cleanInput(text: string): string {
  return text
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const REDACTIONS: [RegExp, string][] = [
  [/AIza[0-9A-Za-z_-]{20,}/g, '[hidden]'], // Google API keys
  [/\bpostgres(?:ql)?:\/\/\S+/gi, '[hidden]'], // connection strings
  [/\b(?:sk|pk|rk)_[A-Za-z0-9_-]{16,}\b/g, '[hidden]'], // generic secret tokens
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email hidden]'],
  [/(?:\+?63|\b0)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[number hidden]'], // PH mobile numbers
  [/\b\d{2}-?\d{9}-?\d\b/g, '[ID hidden]'], // PhilHealth numbers
];

/** Removes anything that looks like a secret or personal identifier from model output. */
export function redact(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REDACTIONS) out = out.replace(pattern, replacement);
  return out;
}

/** Final shaping of a model reply: scrub, strip markdown emphasis, cap length. */
export function finalizeReply(text: string): string {
  const scrubbed = redact(text).replace(/\*\*|__|`/g, '').trim();
  return scrubbed.length > MAX_REPLY_CHARS ? `${scrubbed.slice(0, MAX_REPLY_CHARS - 1).trimEnd()}…` : scrubbed;
}
