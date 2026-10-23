import { safetyReplies, type AssistantLanguage } from '../../../shared/assistant-language';

export interface Msg {
  from: 'user' | 'bot';
  text: string;
  link?: { to: string; label: string };
}

export type Ctx = { name: string; weekCount: number; active: number };

export function localAnswer(text: string, ctx: Ctx, language: AssistantLanguage): Msg | null {
  const t = text.toLowerCase();
  if (/(emergenc|emerhensia|chest pain|can'?t breathe|cannot breathe|unconscious|bleeding|stroke|seizure|saklolo|hindi(?:\s+\w+){0,3}\s+makahinga|di makahinga|sakit.*dibdib|dugo|saan.*makanges)/.test(t))
    return { from: 'bot', text: safetyReplies[language].emergency };
  let key: keyof typeof copy.English | undefined;
  let to = '';
  if (/\b(status|track|kiddawko)\b|\bmy (requests?|bookings?)\b|(?:aking|ko|kiddawko).*(?:request|booking)|(?:request|booking).*(?:ko|akin)/.test(t)) { key = 'requests'; to = '/requests'; }
  else if (/\b(my|this week'?s?) (report|usage|summary)\b|service usage|(?:report|ulat|pakaammo).*(?:ko|ak)|(?:aking|ko).*(?:report|ulat)/.test(t)) { key = 'reports'; to = '/reports/trends'; }
  else if (/\bmy (profile|address|family)\b|(?:profile|address|family|pamilya|tirahan).*(?:ko|ak)|(?:aking|ko).*(?:profile|pamilya|tirahan)/.test(t)) { key = 'profile'; to = '/profile'; }
  return key ? { from: 'bot', text: copy[language][key](ctx), link: { to, label: copy[language].open(ctx) } } : null;
}

export const copy = {
  English: {
    requests: (c: Ctx) => `You have ${c.active} active requests.`,
    reports: (c: Ctx) => `You have ${c.weekCount} service records in the last 7 days.`,
    profile: (c: Ctx) => `Here is ${c.name}’s profile and circle of care.`,
    open: (_c: Ctx) => 'Open in app',
    fallback: (_c: Ctx) => 'The AI assistant is unavailable right now. You can find services, requests, reports, your profile, and plans in the app. Please try again later.',
    thinking: (_c: Ctx) => 'Thinking…',
  },
  Tagalog: {
    requests: (c: Ctx) => `Mayroon kang ${c.active} aktibong request.`,
    reports: (c: Ctx) => `Mayroon kang ${c.weekCount} tala ng serbisyo sa nakaraang 7 araw.`,
    profile: (c: Ctx) => `Narito ang profile at mga kasama sa pangangalaga ni ${c.name}.`,
    open: (_c: Ctx) => 'Buksan sa app',
    fallback: (_c: Ctx) => 'Hindi available ang AI assistant ngayon. Makikita sa app ang mga serbisyo, request, ulat, iyong profile, at mga plano. Subukan muli mamaya.',
    thinking: (_c: Ctx) => 'Nag-iisip…',
  },
  Ilocano: {
    requests: (c: Ctx) => `Adda ${c.active} nga aktibo a kiddawmo.`,
    reports: (c: Ctx) => `Adda ${c.weekCount} a rekord ti serbisio iti napalabas a 7 nga aldaw.`,
    profile: (c: Ctx) => `Adtoy ti profile ken dagiti katulong iti panangaywan ni ${c.name}.`,
    open: (_c: Ctx) => 'Luktan iti app',
    fallback: (_c: Ctx) => 'Saan nga available ti AI assistant ita. Makitam iti app dagiti serbisio, kiddaw, report, profile-mo, ken plano. Padasem manen inton madamdama.',
    thinking: (_c: Ctx) => 'Agpanpanunot…',
  },
};

export function reply(_text: string, ctx: Ctx, language: AssistantLanguage): Msg {
  return { from: 'bot', text: copy[language].fallback(ctx), link: { to: '/services', label: copy[language].open(ctx) } };
}

