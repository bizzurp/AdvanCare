import { localAnswer, reply, copy, type Msg } from '../services/assistant-replies';
import { assistantLanguage, type AssistantLanguage } from '../../../shared/assistant-language';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader, Screen } from '../components/ui';
import { askAssistant, type AssistantTurn } from '../services/api';
import { useApp } from '../state/AppState';

export function Assistant() {
  const { profile, requests, session, prefs } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [replyLanguage, setReplyLanguage] = useState<AssistantLanguage>('English');
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
    const language = assistantLanguage([...msgs.map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', text: m.text })), { role: 'user', text }], prefs.language);
    setReplyLanguage(language);
    const local = localAnswer(text, ctx, language);
    if (local) {
      setMsgs((m) => [...m, { from: 'user', text }, local]);
      return;
    }
    // Only the conversation text goes to the server — no profile or request data from this device.
    const history: AssistantTurn[] = [...msgs, { from: 'user' as const, text }].map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', text: m.text }));
    setMsgs((m) => [...m, { from: 'user', text }]);
    setThinking(true);
    try {
      const a = await askAssistant(history, session?.accessToken, language);
      setMsgs((m) => [...m, { from: 'bot', text: a.reply, link: a.link ?? undefined }]);
    } catch {
      // Still help: point to the right part of the app.
      setMsgs((m) => [...m, reply(text, ctx, language)]);
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
              {copy[replyLanguage].thinking(ctx)}
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
