import QRCode from 'qrcode';
import { useEffect, useState, type FormEvent } from 'react';
import { api, type Me } from '../api';
import { Button, CodeInput, ErrorNotice, Loading, Notice, RecoveryCodes, useAction } from '../components/ui';
import { AuthShell } from './AuthShell';

/**
 * Two-step verification setup: scan → confirm a code → save recovery codes → continue.
 * Used after accepting an invite, and when signing in after a 2FA reset.
 */
export function Enroll({ challenge, onDone, onRestart }: { challenge: string; onDone: (me: Me) => void; onRestart: () => void }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ me: Me; codes: string[] } | null>(null);
  const [saved, setSaved] = useState(false);
  const load = useAction();
  const confirm = useAction();

  useEffect(() => {
    void load.run(async () => {
      const { secret, otpauthUri } = await api.setupMfa(challenge);
      setSetup({ secret, qr: await QRCode.toDataURL(otpauthUri, { margin: 1, width: 200, color: { dark: '#173e37', light: '#ffffff' } }) });
    });
  }, [challenge, load.run]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await confirm.run(() => api.enrollMfa(challenge, code));
    if (res) setResult({ me: res.me, codes: res.recoveryCodes });
    else setCode('');
  };

  if (result) {
    return (
      <AuthShell title="Save your recovery codes" subtitle="If you lose your phone, each of these codes lets you sign in once. They won’t be shown again." wide>
        <RecoveryCodes codes={result.codes} email={result.me.email} />
        <label className="check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I saved these codes somewhere safe (not on this computer’s desktop)
        </label>
        <Button className="block" disabled={!saved} onClick={() => onDone(result.me)}>
          Continue to the console
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set up two-step verification" subtitle="Staff accounts need an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy…)." wide>
      {load.error ? (
        <>
          <ErrorNotice error={load.error} />
          <Button variant="secondary" onClick={onRestart}>
            Back to sign in
          </Button>
        </>
      ) : !setup ? (
        <Loading label="Preparing your setup…" />
      ) : (
        <form onSubmit={submit} className="stack16">
          <div className="enroll-grid">
            <img src={setup.qr} alt="QR code for your authenticator app" width={200} height={200} className="qr" />
            <ol className="steps">
              <li>Open your authenticator app and add an account.</li>
              <li>Scan this QR code with your phone’s camera.</li>
              <li>
                Can’t scan? Enter this key instead:
                <code className="secret">{setup.secret.match(/.{1,4}/g)?.join(' ')}</code>
              </li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
          </div>
          <CodeInput value={code} onChange={setCode} autoFocus />
          <ErrorNotice error={confirm.error} />
          <Button type="submit" className="block" busy={confirm.busy} disabled={code.length !== 6}>
            Confirm and turn on
          </Button>
        </form>
      )}
      <Notice tone="info">Your sign-in step expires after 10 minutes. If it does, just sign in again.</Notice>
    </AuthShell>
  );
}
