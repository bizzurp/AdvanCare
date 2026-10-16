import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { OnboardingArtCareWay, OnboardingArtClearer, OnboardingArtConnected, WelcomeHero } from '../components/Illustrations';
import { Brand, Button, DependencyNote, LinkButton, PageHeader, Screen, TextField } from '../components/ui';
import { DEPENDENCIES } from '../data/catalog';
import { ApiError, requestOtp, verifyOtp } from '../services/api';
import { useApp } from '../state/AppState';

// ---------------- 01 / Welcome ----------------
export function Welcome() {
  const { onboarded } = useApp();
  return (
    <Screen>
      <div className="screen-body no-header" style={{ gap: 0 }}>
        <div style={{ padding: '8px 0 28px' }}>
          <Brand />
        </div>
        <h1 className="t-welcome">
          Care that feels
          <br />
          close to home.
        </h1>
        <p className="t-body t-muted mt-12">
          Quality care. For every family.
          <br />
          In every community.
        </p>
        <div className="mt-24">
          <WelcomeHero />
        </div>
        <p className="t-caption t-medium t-teal mt-24">Care Today. Stronger Tomorrow.</p>
        <div className="stack gap-16 mt-16" style={{ paddingBottom: 'var(--safe-bottom)' }}>
          <LinkButton to={onboarded ? '/sign-in' : '/onboarding'}>Get started</LinkButton>
          <LinkButton to="/sign-in" variant="secondary">
            I already have an account
          </LinkButton>
        </div>
      </div>
    </Screen>
  );
}

// ---------------- Onboarding 01–03 ----------------
const SLIDES = [
  {
    title: ['Care starts', 'with connection.'],
    body: 'Support for you and the people you love, connected through AdvanCare.',
    Art: OnboardingArtConnected,
  },
  {
    title: ['Expert care.', 'A little closer.'],
    body: 'Consult a doctor, arrange transport, or request a caregiver — all in one place.',
    Art: OnboardingArtCareWay,
  },
  {
    title: ['More clarity.', 'Less to keep track of.'],
    body: 'Keep care records together, explore reports, and find help with your care assistant.',
    Art: OnboardingArtClearer,
  },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding } = useApp();
  const [index, setIndex] = useState(0);
  const [drag, setDragState] = useState(0);
  const dragRef = useRef(0);
  const setDrag = (v: number) => {
    dragRef.current = v;
    setDragState(v);
  };
  const start = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const last = SLIDES.length - 1;

  const go = (i: number) => setIndex(Math.max(0, Math.min(last, i)));
  const toSignIn = () => {
    completeOnboarding();
    navigate('/sign-in');
  };

  const onPointerDown = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
  };
  const onPointerMove = (e: RPointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > 8) {
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (s.horizontal) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (s.horizontal) {
      // Resist dragging past the ends.
      const atEdge = (index === 0 && dx > 0) || (index === last && dx < 0);
      setDrag(atEdge ? dx / 4 : dx);
    }
  };
  const onPointerUp = () => {
    const width = viewport.current?.clientWidth ?? 390;
    if (start.current?.horizontal) {
      const dx = dragRef.current;
      if (dx < -width * 0.2) go(index + 1);
      else if (dx > width * 0.2) go(index - 1);
    }
    start.current = null;
    setDrag(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };

  return (
    <div className="onb screen">
      <header className="row between" style={{ padding: 'calc(var(--safe-top) + 12px) 12px 12px var(--gutter)' }}>
        <Brand />
        <button className="link-btn" onClick={toSignIn} style={{ padding: '10px 12px' }}>
          Skip
        </button>
      </header>
      <section
        className="onb-viewport"
        ref={viewport}
        aria-roledescription="carousel"
        aria-label="Introduction to AdvanCare"
        onKeyDown={onKeyDown}
      >
        <div
          className={`onb-track ${drag !== 0 ? 'dragging' : ''}`}
          style={{ transform: `translateX(calc(${-index * 100}% + ${drag}px))` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {SLIDES.map(({ title, body, Art }, i) => (
            <div
              key={i}
              className="onb-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
              aria-hidden={i !== index}
              {...(i !== index ? { inert: '' } : {})}
            >
              <Art />
              <div>
                <h1 className="t-onboarding">
                  {title[0]}
                  <br />
                  {title[1]}
                </h1>
                <p className="t-body t-muted mt-12">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="sr-only" aria-live="polite">
        Slide {index + 1} of {SLIDES.length}
      </p>
      <div style={{ padding: '0 var(--gutter)' }}>
        <div className="row" style={{ position: 'relative', justifyContent: 'center', minHeight: 44 }}>
          {index > 0 && (
            <button className="icon-btn" style={{ position: 'absolute', left: -12 }} onClick={() => go(index - 1)} aria-label="Previous slide">
              <Icon name="alt-arrow-left" />
            </button>
          )}
          <div className="pager">
            {SLIDES.map((_, i) => (
              <button key={i} aria-label={`Go to slide ${i + 1}`} aria-current={i === index} onClick={() => go(i)}>
                <span />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="action-bar" style={{ position: 'static', background: 'none' }}>
        <Button onClick={() => (index === last ? toSignIn() : go(index + 1))}>{index === last ? 'Continue to sign in' : 'Next'}</Button>
        <p className="t-caption t-center t-muted">
          Already have an account?{' '}
          <button className="link-btn" style={{ fontSize: 13, padding: '0 4px', minHeight: 32 }} onClick={toSignIn}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

// ---------------- 02 / Sign in (email + 6-digit code; SMS later) ----------------
export function normalizeLocal(input: string) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('63')) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function formatPhone(e164: string) {
  const d = e164.replace(/^\+63/, '');
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailCode({ mode, onVerified }: { mode: 'sign-in' | 'register'; onVerified: (email: string, token: { accessToken: string; role?: string }) => void }) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentNote, setSentNote] = useState('');
  const otpRef = useRef<HTMLInputElement>(null);
  const address = email.trim().toLowerCase();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const send = async () => {
    if (!EMAIL.test(address)) {
      setError('Enter an email address, like juan.delacruz@gmail.com.');
      return;
    }
    setError('');
    setSentNote('');
    setLoading(true);
    const resend = step === 'otp';
    try {
      await requestOtp(address);
      setStep('otp');
      setOtp('');
      setCooldown(60);
      // Only the newest code works; say so, so people don't type an older one.
      if (resend) setSentNote(`New code sent at ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. Only the code in the newest email works.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      onVerified(address, await verifyOtp(address, otp));
    } catch (e) {
      // The server limits wrong tries (5 per code) and says when to ask for a new one.
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'email')
    return (
      <form
        className="stack gap-20"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        noValidate
      >
        <TextField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="juan.delacruz@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          hint={mode === 'register' ? 'We’ll email a 6-digit code to confirm this address.' : 'We’ll email you a 6-digit sign-in code.'}
        />
        <Button type="submit" loading={loading}>
          Send code
        </Button>
      </form>
    );

  return (
    <form
      className="stack gap-20"
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
      noValidate
    >
      <p className="t-body t-muted">
        Enter the code sent to <span className="t-medium" style={{ color: 'var(--ink)' }}>{address}</span>.{' '}
        <button type="button" className="link-btn" style={{ padding: 0, minHeight: 0, fontSize: 16 }} onClick={() => setStep('email')}>
          Change
        </button>
      </p>
      <TextField
        ref={otpRef}
        label="6-digit code"
        className="otp-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        error={error}
        hint="Can’t find it? Check your Spam or Promotions folder. The code expires in 10 minutes."
      />
      {sentNote && (
        <p className="t-small t-teal" role="status">
          {sentNote}
        </p>
      )}
      <Button type="submit" loading={loading} disabled={otp.length !== 6}>
        Verify and continue
      </Button>
      <button type="button" className="link-btn" style={{ alignSelf: 'center' }} disabled={cooldown > 0 || loading} onClick={() => void send()}>
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
    </form>
  );
}

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useApp();
  return (
    <Screen>
      <PageHeader title="" back="/welcome" />
      <div className="screen-body">
        <Brand />
        <h1 className="t-h1 mt-32" style={{ fontSize: 32, lineHeight: '40px' }}>
          Welcome back.
        </h1>
        <p className="t-body t-muted mt-12">Sign in to care for the people you love.</p>
        <div className="mt-32">
          <EmailCode
            mode="sign-in"
            onVerified={(email, r) => {
              const caregiver = r.role === 'CAREGIVER';
              signIn({ email, accessToken: r.accessToken, role: caregiver ? 'caregiver' : 'household' });
              const from = (location.state as { from?: string } | null)?.from;
              navigate(caregiver ? '/caregiver' : (from ?? '/home'), { replace: true });
            }}
          />
        </div>
        <div className="row gap-12 mt-24" aria-hidden="true">
          <hr className="divider grow" />
          <span className="t-caption t-muted">or</span>
          <hr className="divider grow" />
        </div>
        <div className="stack gap-12 mt-24">
          <LinkButton to="/register" variant="secondary">
            Create an account
          </LinkButton>
          <Link to="/help" className="link-btn" style={{ textAlign: 'center' }}>
            Trouble signing in?
          </Link>
        </div>
        <p className="row gap-8 t-caption t-muted mt-24" style={{ justifyContent: 'center' }}>
          <Icon name="shield-check" size={16} /> Your information stays private and secure.
        </p>
      </div>
    </Screen>
  );
}

// ---------------- 21 / Help (account support) ----------------
export function Help() {
  // Reachable signed out (from sign-in) and signed in (from More); only the latter has the nav.
  const { session } = useApp();
  return (
    <Screen nav={session ? 'more' : false}>
      <PageHeader title="Account support" />
      <div className="screen-body stack gap-20">
        <h2 className="t-h2">Contact your AdvanCare team for help with account access or registration.</h2>
        <p className="t-body t-muted">
          Your Barangay Health Worker can also register you or a family member, and help if you no longer use the email address on your account.
        </p>
        <a className="btn btn-primary" href="tel:+639000000000" aria-describedby="support-dep">
          <Icon name="phone" size={20} />
          Contact care support
        </a>
        <div id="support-dep">
          <DependencyNote>The care support hotline number has not been assigned yet; the button uses a placeholder number.</DependencyNote>
        </div>
        <DependencyNote title="Sign-in codes">{DEPENDENCIES.sms}</DependencyNote>
      </div>
    </Screen>
  );
}
