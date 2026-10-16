import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader, Screen } from '../components/ui';
import { askAssistant, type AssistantTurn } from '../services/api';
import { useApp } from '../state/AppState';

interface Msg {
  from: 'user' | 'bot';
  text: string;
  link?: { to: string; label: string };
}

type Ctx = { name: string; weekCount: number; active: number };

/**
 * Answered on the device, never sent to the AI: possible emergencies (instant, works
 * offline) and questions about the person's own data, which only exists on this phone.
 */
function localAnswer(text: string, ctx: Ctx): Msg | null {
  const t = text.toLowerCase();
  if (/(emergenc|chest pain|can'?t breathe|cannot breathe|unconscious|bleeding|stroke|seizure|saklolo|hindi makahinga)/.test(t))
    return { from: 'bot', text: 'If this may be an emergency, call 911 or go to the nearest hospital now.' };
  if (/\b(status|track)\b|\bmy (requests?|bookings?)\b/.test(t))
    return { from: 'bot', text: `You have ${ctx.active} active request${ctx.active === 1 ? '' : 's'}.`, link: { to: '/requests', label: 'Track requests' } };
  if (/\b(my|this week'?s?) (report|usage|summary)\b|service usage/.test(t))
    return { from: 'bot', text: `You have ${ctx.weekCount} service record${ctx.weekCount === 1 ? '' : 's'} in the last 7 days.`, link: { to: '/reports/trends', label: 'View report' } };
  if (/\bmy (profile|address|family)\b/.test(t)) return { from: 'bot', text: `Here is ${ctx.name}’s profile and circle of care.`, link: { to: '/profile', label: 'Open profile' } };
  return null;
}

/**
 * Shortcut answers used when the AI assistant can't be reached (offline, rate limited). It only
 * routes to app sections and summarises the person's own data; it never gives medical advice.
 */
function reply(text: string, ctx: Ctx): Msg {
  const t = text.toLowerCase();
  if (/(emergenc|chest pain|can'?t breathe|unconscious|bleeding)/.test(t))
    return { from: 'bot', text: 'If this may be an emergency, call 911 or go to the nearest hospital now.' };
  if (/(report|usage|summary|trend)/.test(t))
    return { from: 'bot', text: `You have ${ctx.weekCount} service record${ctx.weekCount === 1 ? '' : 's'} in the last 7 days.`, link: { to: '/reports/trends', label: 'View report' } };
  if (/(status|track|request)/.test(t)) return { from: 'bot', text: `You have ${ctx.active} active request${ctx.active === 1 ? '' : 's'}.`, link: { to: '/requests', label: 'Track requests' } };
  if (/(doctor|consult|telehealth|gp)/.test(t)) return { from: 'bot', text: 'You can book a TeleHealth consultation with a general practitioner.', link: { to: '/services/telehealth', label: 'Book TeleHealth' } };
  if (/(rhu|dentist|dental|midwife|nurse|prenatal)/.test(t)) return { from: 'bot', text: 'Your Rural Health Unit offers doctor, dentist, nurse, and midwife services.', link: { to: '/services/rhu', label: 'Open RHU services' } };
  if (/(transport|ride|vehicle|tricycle|van)/.test(t)) return { from: 'bot', text: 'You can book a public or private vehicle for a scheduled visit.', link: { to: '/services/transport', label: 'Book transport' } };
  if (/(caregiver|watcher|cvmc|bantay)/.test(t)) return { from: 'bot', text: 'Home caregivers are ₱300 and CVMC caregivers ₱500 for an 8-hour shift.', link: { to: '/services', label: 'Request a caregiver' } };
  if (/(sick|symptom|fever|pain|cough|assess|triage)/.test(t))
    return { from: 'bot', text: 'I can’t give medical advice. You can send an assessment for a clinician to review.', link: { to: '/services/triage', label: 'Start an assessment' } };
  if (/(profile|client|family|address)/.test(t)) return { from: 'bot', text: `Here is ${ctx.name}’s profile and circle of care.`, link: { to: '/profile', label: 'Open profile' } };
  if (/(plan|member|subsid|silver|gold|platinum)/.test(t)) return { from: 'bot', text: 'Plans are Silver, Gold, and Platinum, with half paid by your LGU.', link: { to: '/plans', label: 'See plans' } };
  return { from: 'bot', text: 'I can help you find services, requests, reports, your profile, and plans. Try one of the shortcuts above.' };
}

export function Assistant() {
  const { profile, requests, session } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const weekAgo = Date.now() - 7 * 864e5;
  const ctx = {
    name: profile.fullName.split(' ')[0],
    weekCount: requests.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).length,
    active: requests.filter((r) => !['completed', 'cancelled'].includes(r.status)).length,
  };

  useEffect(() => {
    if (msgs.length || thinking) end.current?.scrollIntoView({ block: 'end' });
  }, [msgs, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput('');
    const local = localAnswer(text, ctx);
    if (local) {
      setMsgs((m) => [...m, { from: 'user', text }, local]);
      return;
    }
    // Only the conversation text goes to the server — no profile or request data from this device.
    const history: AssistantTurn[] = [...msgs, { from: 'user' as const, text }].map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', text: m.text }));
    setMsgs((m) => [...m, { from: 'user', text }]);
    setThinking(true);
    try {
      const a = await askAssistant(history, session?.accessToken);
      setMsgs((m) => [...m, { from: 'bot', text: a.reply, link: a.link ?? undefined }]);
    } catch {
      // Still help: point to the right part of the app.
      setMsgs((m) => [...m, reply(text, ctx)]);
    } finally {
      setThinking(false);
    }
  };

  const quick: { label: string; icon: IconName; to: string }[] = [
    { label: 'Check client information', icon: 'user-rounded', to: '/profile' },
    { label: 'Book a service', icon: 'medical-kit', to: '/services' },
    { label: 'View reports', icon: 'chart-square', to: '/reports' },
  ];

  return (
    <Screen nav>
      <PageHeader title="Care assistant" back={false} />
      <div className="screen-body stack gap-12">
        <div className="card card-mint stack gap-8" style={{ padding: 18 }}>
          <Icon name="chat-round-dots" className="t-teal" />
          <h2 className="t-h2" style={{ fontSize: 22, lineHeight: '30px' }}>
            A little help,
            <br />
            whenever you need it.
          </h2>
          <p className="t-small t-muted">Find client information, book services, and understand your reports.</p>
        </div>
        {quick.map((q) => (
          <Link key={q.to} to={q.to} className="service-row" style={{ minHeight: 52, padding: '12px 14px' }}>
            <Icon name={q.icon} className="t-teal" />
            <span className="grow t-medium">{q.label}</span>
          </Link>
        ))}
        <div className="stack gap-12 mt-8" aria-live="polite" aria-label="Conversation">
          {msgs.length === 0 && (
            <button className="bubble user" style={{ border: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => send('Show me this week’s service usage report.')}>
              Show me this week’s service usage report.
            </button>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.from}`}>
              {m.text}
              {m.link && (
                <Link to={m.link.to} className="row gap-4 t-semibold mt-8" style={{ color: 'var(--teal)', textDecoration: 'none', minHeight: 32 }}>
                  {m.link.label} <Icon name="arrow-right" size={18} />
                </Link>
              )}
            </div>
          ))}
          {thinking && (
            <div className="bubble bot row gap-8" role="status">
              <span className="spinner" aria-hidden="true" />
              Thinking…
            </div>
          )}
          {/* Keeps the newest message clear of the sticky input and bottom nav when scrolled into view. */}
          <div ref={end} style={{ scrollMarginBottom: 150 }} />
        </div>
        <p className="t-small t-muted">
          Answers about AdvanCare come from an AI assistant and can be wrong. It cannot give medical advice. Questions about your own requests and profile are answered on this phone.
        </p>
      </div>
      <form
        className="row gap-8"
        style={{ position: 'sticky', bottom: 'calc(var(--safe-bottom) + 76px)', padding: '8px var(--gutter)', background: 'var(--paper)' }}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="ask" className="sr-only">
          Message
        </label>
        <div className="input-wrap grow">
          <input id="ask" className="input has-trail" placeholder="Ask about AdvanCare…" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" maxLength={500} />
          <button className="icon-btn input-trail t-teal" aria-label="Send" type="submit" disabled={thinking}>
            <Icon name="arrow-right" />
          </button>
        </div>
      </form>
    </Screen>
  );
}
