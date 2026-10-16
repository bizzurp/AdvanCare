import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildDemoHouseholdHistory, DEMO_PROFILE } from '../data/demo';
import type { ClientProfile, Role, ServiceRequest } from '../data/types';
import { ApiError, appServiceStatus, appStatus, getAccount, isServiceKind, myClients, myServiceRequests, myShifts, profileFromServer, signOutRemote, submitServiceRequest, syncClient, type Account } from '../services/api';

export interface Session {
  /** How the person signed in (email code). Older sessions on a phone may carry `phone` instead. */
  email?: string;
  phone?: string;
  accessToken: string;
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
  /** The signed-in account's own details (from the server). */
  account: Account | null;
}

const KEY = 'advancare.v1';

const initial = (): Persisted => ({
  onboarded: false,
  session: null,
  profile: DEMO_PROFILE,
  requests: buildDemoHouseholdHistory(),
  prefs: { language: 'English', textSize: 'default', familySmsUpdates: true, requestReminders: true },
  drafts: {},
  account: null,
});

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = { ...initial(), ...(JSON.parse(raw) as Partial<Persisted>) };
      // Sessions from the retired offline preview had no server token: sign in again.
      if (saved.session?.accessToken === 'demo') saved.session = null;
      // Requests the retired preview kept on the phone are sent like any offline request.
      saved.requests = saved.requests.map((r) => (r.status === 'saved-demo' && !r.isDemoRecord ? { ...r, status: 'queued', dependencyNote: undefined } : r));
      return saved;
    }
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
  /** Saves profile changes on the phone and on the server; resolves to an error message or null. */
  saveProfile: (p: Partial<ClientProfile>) => Promise<string | null>;
  setAccount: (a: Account | null) => void;
  addRequest: (r: ServiceRequest) => void;
  updateRequest: (id: string, patch: Partial<ServiceRequest>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setDraft: (key: string, value: unknown) => void;
  clearDraft: (key: string) => void;
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
        const res = await submitServiceRequest(r, stateRef.current.session?.accessToken, stateRef.current.profile);
        if (res.status !== 'queued') updateRequest(r.id, { status: res.status, dependencyNote: res.dependencyNote, serverId: res.serverId });
      } catch {
        break; // keep remaining items queued; retried on next reconnect
      }
    }
  }, [updateRequest]);

  // Follow bookings the server knows about (staff confirming, caregiver starting, etc.).
  const refreshStatuses = useCallback(async () => {
    const session = stateRef.current.session;
    if (!session || session.role === 'caregiver' || !stateRef.current.requests.some((r) => r.serverId)) return;
    try {
      const [shiftList, serviceList] = await Promise.all([myShifts(session.accessToken), myServiceRequests(session.accessToken)]);
      const shifts = new Map(shiftList.map((s) => [s.id, s]));
      const services = new Map(serviceList.map((s) => [s.id, s]));
      setState((st) => ({
        ...st,
        requests: st.requests.map((r) => {
          if (!r.serverId) return r;
          if (isServiceKind(r.kind)) {
            const v = services.get(r.serverId);
            return v
              ? {
                  ...r,
                  status: appServiceStatus(v.status),
                  ...(v.preferredAt && !v.scheduledAt ? { scheduledFor: v.preferredAt } : {}),
                  serverRef: v.ref,
                  staffNote: v.staffNote ?? undefined,
                  cancellationReason: v.cancellationReason ?? undefined,
                  ...(v.scheduledAt ? { scheduledFor: v.scheduledAt } : {}),
                  assignedProvider: v.assignedProvider ?? undefined,
                }
              : r;
          }
          const s = shifts.get(r.serverId);
          return s ? { ...r, status: appStatus(s.status), serverRef: s.ref, caregiverFirstName: s.caregiverFirstName ?? undefined, paid: s.paid, careNotes: s.careNotes } : r;
        }),
      }));
    } catch {
      /* offline or signed out: keep what's on the phone */
    }
  }, []);

  // After sign-in: load the account and the client saved on it, so edits made elsewhere show here.
  const token = state.session?.accessToken;
  useEffect(() => {
    const session = stateRef.current.session;
    if (!token || !session || session.role === 'caregiver') return;
    let stop = false;
    void (async () => {
      try {
        const [account, clients] = await Promise.all([getAccount(token), myClients(token)]);
        if (stop) return;
        setState((s) => {
          const own = clients.find((c) => c.deviceRef === s.profile.id) ?? clients[0];
          return { ...s, account, profile: own ? profileFromServer(own, s.profile) : s.profile };
        });
      } catch {
        /* offline: keep what's on the phone */
      }
    })();
    return () => {
      stop = true;
    };
  }, [token]);

  useEffect(() => {
    if (token && navigator.onLine) void flushQueue();
  }, [token, flushQueue]);

  useEffect(() => {
    void refreshStatuses();
    const onFocus = () => void refreshStatuses();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(() => void refreshStatuses(), 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [refreshStatuses, state.session?.accessToken]);

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
      signOut: () => {
        void signOutRemote(stateRef.current.session?.accessToken);
        setState((s) => ({ ...s, session: null, account: null }));
      },
      setRole: (role) => setState((s) => (s.session ? { ...s, session: { ...s.session, role } } : s)),
      updateProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      saveProfile: async (p) => {
        const next = { ...stateRef.current.profile, ...p };
        setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));
        const t = stateRef.current.session?.accessToken;
        if (!t || stateRef.current.session?.role === 'caregiver') return null;
        try {
          await syncClient(next, t);
          return null;
        } catch (e) {
          return e instanceof ApiError ? e.message : 'Saved on this phone. We’ll send it to AdvanCare when you’re back online.';
        }
      },
      setAccount: (account) => setState((s) => ({ ...s, account })),
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
