import { useState, type KeyboardEvent } from 'react';
import { signIn } from '../lib/auth';
import type { User } from '../types';
import { Btn, C, Hov, Input } from '../ui/kit';
import { Icon } from '../ui/Icon';

export function LoginScreen({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!username.trim() || !password) {
      setError('Enter a username and password.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await signIn(username, password);
    setBusy(false);
    if (res.error || !res.user) {
      setPassword('');
      setError(res.error || 'Sign in failed.');
      return;
    }
    onSignedIn(res.user);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') void submit();
  };

  const border = error ? '#f3c9d2' : C.border;

  return (
    <div
      className="fade"
      style={{
        position: 'fixed', inset: 0, zIndex: 70, background: C.ink,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflowY: 'auto',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(58% 52% at 76% 8%, rgba(253,151,7,.16) 0%, rgba(11,18,32,0) 72%)',
      }} />

      <div
        className="pop"
        style={{
          position: 'relative', width: '100%', maxWidth: 352, background: C.panel,
          borderRadius: 10, padding: '30px 28px', boxShadow: '0 24px 60px rgba(0,0,0,.42)',
        }}
      >
        <img
          src="/logo.png"
          alt="SOLE"
          style={{ height: 24, width: 'auto', display: 'block', margin: '0 auto 7px', flexShrink: 0 }}
        />
        <p style={{
          margin: '0 0 24px', textAlign: 'center', fontSize: 9, fontWeight: 600,
          letterSpacing: '.16em', textTransform: 'uppercase', color: C.muted3,
        }}>
          Sun Tours Travels · Operations
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.body }}>Username</span>
            <Input
              value={username}
              autoFocus
              autoComplete="username"
              onChange={(e: any) => { setUsername(e.target.value); setError(''); }}
              onKeyDown={onKey}
              placeholder="sina"
              style={{ height: 36, fontSize: 13, padding: '0 10px', borderColor: border }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.body }}>Password</span>
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Input
                type={shown ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                onChange={(e: any) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={onKey}
                placeholder="••••••"
                style={{ height: 36, fontSize: 13, padding: '0 34px 0 10px', borderColor: border }}
              />
              <Hov
                as="button"
                type="button"
                onClick={() => setShown(v => !v)}
                title={shown ? 'Hide the password' : 'Show the password'}
                style={{
                  position: 'absolute', right: 6, width: 24, height: 24, border: 0,
                  background: 'transparent', borderRadius: 5, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: C.faint, padding: 0,
                }}
                hover={{ color: C.ink, background: C.paper }}
              >
                <Icon name={shown ? 'eyeOff' : 'eye'} size={14} />
              </Hov>
            </span>
          </label>

          {error && (
            <p className="shake" style={{
              margin: 0, fontSize: 11.5, fontWeight: 600, color: C.bad,
              background: C.badBg, border: '1px solid #f6dbe1', borderRadius: 6, padding: '7px 9px',
            }}>
              {error}
            </p>
          )}

          <Btn
            variant="primary"
            onClick={submit}
            disabled={busy}
            style={{ marginTop: 4, height: 38, fontSize: 13, width: '100%' }}
          >
            {busy && <Icon name="spinner" size={14} className="spin" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </Btn>
        </div>

        <p style={{
          margin: '19px 0 0', paddingTop: 14, borderTop: `1px solid ${C.lineSoft}`,
          textAlign: 'center', fontSize: 10.5, color: C.muted3,
        }}>
          Powered by{' '}
          <a href="https://onyxx-tech.vercel.app/index.html" target="_blank" rel="noopener noreferrer">
            Onyxx Tech Hub
          </a>
        </p>
      </div>
    </div>
  );
}
