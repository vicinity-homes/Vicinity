'use client';

import { createClient } from '@/lib/supabase/client';
import { SignupWithPassword } from '@/lib/zod/auth';
import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function SignupForm({ redirect }: { redirect: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError(null);

    const parsed = SignupWithPassword.safeParse({ email, password, confirm });
    if (!parsed.success) {
      setStatus('error');
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    const supabase = createClient();
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('redirect', redirect);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: callback.toString() },
    });

    if (signUpError) {
      setStatus('error');
      setError(signUpError.message);
      return;
    }

    // With email confirmation OFF (internal beta), Supabase returns a session
    // immediately and the user is logged in. With it ON (post-GA), `session`
    // is null and we show the confirm-email screen.
    if (data.session) {
      window.location.assign(redirect);
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="space-y-4 rounded-lg border border-bronze/30 bg-ink2 p-6 text-center">
        <p className="text-sm text-cream">
          Check your inbox at <span className="font-medium text-gold">{email}</span> to confirm your
          account.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
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
      <label className="block space-y-1">
        <span className="text-sm font-medium text-cream">Password</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={status === 'sending'}
          className="w-full rounded-md border border-bronze/40 bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none disabled:opacity-50"
          placeholder="At least 8 characters"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-cream">Confirm password</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={status === 'sending'}
          className="w-full rounded-md border border-bronze/40 bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none disabled:opacity-50"
          placeholder="Re-enter password"
        />
      </label>
      <button
        type="submit"
        disabled={
          status === 'sending' ||
          email.length === 0 ||
          password.length === 0 ||
          confirm.length === 0
        }
        className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/90 disabled:cursor-not-allowed disabled:bg-bronze/40 disabled:text-cream/40"
      >
        {status === 'sending' ? 'Creating account…' : 'Create account'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
