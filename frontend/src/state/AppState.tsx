import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildDemoHouseholdHistory, DEMO_PROFILE } from '../data/demo';
import type { ClientProfile, Role, ServiceRequest } from '../data/types';
import { submitServiceRequest } from '../services/api';

export interface Session {
  phone: string;
  accessToken: string;
  demo: boolean;
  role: Role;
}

export interface Prefs {
  language: string;
  textSize: 'default' | 'large';
  familySmsUpdates: boolean;
  requestReminders: boolean;
}

interface Persisted {
  onboarded: boolean;
  session: Session | null;
  profile: ClientProfile;
  requests: ServiceRequest[];
  prefs: Prefs;
  drafts: Record<string, unknown>;
}

const KEY = 'advancare.v1';

const initial = (): Persisted => ({
  onboarded: false,
  session: null,
  profile: DEMO_PROFILE,
  requests: buildDemoHouseholdHistory(),
  prefs: { language: 'English', textSize: 'default', familySmsUpdates: true, requestReminders: true },
  drafts: {},
});

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial(), ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    /* storage unavailable: fall back to memory */
  }
  return initial();
}

interface Ctx extends Persisted {
  online: boolean;
  completeOnboarding: () => void;
  signIn: (s: Session) => void;
  signOut: () => void;
  setRole: (r: Role) => void;
  updateProfile: (p: Partial<ClientProfile>) => void;
  addRequest: (r: ServiceRequest) => void;
  updateRequest: (id: string, patch: Partial<ServiceRequest>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setDraft: (key: string, value: unknown) => void;
  clearDraft: (key: string) => void;
  resetDemo: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.text = state.prefs.textSize;
  }, [state.prefs.textSize]);

  const updateRequest = useCallback((id: string, patch: Partial<ServiceRequest>) => {
    setState((s) => ({ ...s, requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }, []);

  // Flush requests queued while offline, in creation order, reusing their idempotency keys.
  const flushQueue = useCallback(async () => {
    const queued = stateRef.current.requests.filter((r) => r.status === 'queued').reverse();
    for (const r of queued) {
      try {
        const res = await submitServiceRequest(r, stateRef.current.session?.accessToken);
        if (res.status !== 'queued') updateRequest(r.id, { status: res.status, dependencyNote: res.dependencyNote });
      } catch {
        break; // keep remaining items queued; retried on next reconnect
      }
    }
  }, [updateRequest]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void flushQueue();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [flushQueue]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      online,
      completeOnboarding: () => setState((s) => ({ ...s, onboarded: true })),
      signIn: (session) => setState((s) => ({ ...s, session, onboarded: true })),
      signOut: () => setState((s) => ({ ...s, session: null })),
      setRole: (role) => setState((s) => (s.session ? { ...s, session: { ...s.session, role } } : s)),
      updateProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      addRequest: (r) => setState((s) => ({ ...s, requests: [r, ...s.requests] })),
      updateRequest,
      setPrefs: (p) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...p } })),
      setDraft: (key, v) => setState((s) => ({ ...s, drafts: { ...s.drafts, [key]: v } })),
      clearDraft: (key) =>
        setState((s) => {
          const drafts = { ...s.drafts };
          delete drafts[key];
          return { ...s, drafts };
        }),
      resetDemo: () => setState({ ...initial(), onboarded: true, session: stateRef.current.session }),
    }),
    [state, online, updateRequest],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}

/** Form state that survives navigation (e.g. Home caregiver → Edit visit → back) and retries. */
export function useDraft<T>(key: string, init: () => T): [T, (patch: Partial<T>) => void, () => void] {
  const { drafts, setDraft, clearDraft } = useApp();
  const value = (drafts[key] as T | undefined) ?? init();
  const valueRef = useRef(value);
  valueRef.current = value;
  const update = useCallback(
    (patch: Partial<T>) => {
      valueRef.current = { ...valueRef.current, ...patch };
      setDraft(key, valueRef.current);
    },
    [key, setDraft],
  );
  return [value, update, () => clearDraft(key)];
}
