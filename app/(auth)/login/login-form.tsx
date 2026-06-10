'use client';

import { createClient } from '@/lib/supabase/client';
import { LoginWithPassword } from '@/lib/zod/auth';
import { useState } from 'react';

type Mode = 'magic' | 'password';
type Status = 'idle' | 'sending' | 'sent' | 'error';

export function LoginForm({ redirect }: { redirect: string }) {
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError(null);

    const supabase = createClient();
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('redirect', redirect);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString() },
    });

    if (otpError) {
      setStatus('error');
      setError(otpError.message);
      return;
    }
    setStatus('sent');
  }

  async function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError(null);

    const parsed = LoginWithPassword.safeParse({ email, password });
    if (!parsed.success) {
      setStatus('error');
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);

    if (signInError) {
      setStatus('error');
      // Supabase returns a generic "Invalid login credentials" — keep that
      // verbatim; it's intentionally non-specific to avoid email enumeration.
      setError(signInError.message);
      return;
    }

    // Force a full reload so server components observe the new auth cookies.
    window.location.assign(redirect);
  }

  if (mode === 'magic' && status === 'sent') {
    return (
      <div className="space-y-4 rounded-lg border border-bronze/30 bg-ink2 p-6 text-center">
        <p className="text-sm text-cream">
          Check your inbox at <span className="font-medium text-gold">{email}</span> for a sign-in
          link.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setEmail('');
          }}
          className="text-sm text-cream/60 underline hover:text-cream"
        >
          Use a different email
        </button>
      </div>
    );
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus('idle');
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 rounded-md border border-bronze/30 bg-ink2 p-1 text-sm"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'magic'}
          onClick={() => switchMode('magic')}
          className={`rounded px-3 py-1.5 transition ${
            mode === 'magic' ? 'bg-gold text-ink' : 'text-cream/70 hover:text-cream'
          }`}
        >
          Magic link
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'password'}
          onClick={() => switchMode('password')}
          className={`rounded px-3 py-1.5 transition ${
            mode === 'password' ? 'bg-gold text-ink' : 'text-cream/70 hover:text-cream'
          }`}
        >
          Password
        </button>
      </div>

      <form
        onSubmit={mode === 'magic' ? handleMagicLink : handlePassword}
        className="space-y-4 rounded-lg border border-bronze/30 bg-ink2 p-6"
      >
        <label className="block space-y-1">
          <span className="text-sm font-medium text-cream">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'sending'}
            className="w-full rounded-md border border-bronze/40 bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none disabled:opacity-50"
            placeholder="you@example.com"
          />
        </label>
        {mode === 'password' ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-cream">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={status === 'sending'}
              className="w-full rounded-md border border-bronze/40 bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none disabled:opacity-50"
              placeholder="••••••••"
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={
            status === 'sending' ||
            email.length === 0 ||
            (mode === 'password' && password.length === 0)
          }
          className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/90 disabled:cursor-not-allowed disabled:bg-bronze/40 disabled:text-cream/40"
        >
          {status === 'sending'
            ? mode === 'magic'
              ? 'Sending…'
              : 'Signing in…'
            : mode === 'magic'
              ? 'Send magic link'
              : 'Sign in'}
        </button>
        {error ? (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
