'use client';

import { createClient } from '@/lib/supabase/client';
import { Email } from '@/lib/zod/auth';
import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError(null);

    const parsed = Email.safeParse(email);
    if (!parsed.success) {
      setStatus('error');
      setError('Enter a valid email');
      return;
    }

    const supabase = createClient();
    // Supabase recovery flow: user clicks the link, lands on /auth/callback
    // which exchanges the code for a session, then redirects to
    // /reset-password where they set a new password via updateUser.
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('redirect', '/reset-password');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: callback.toString(),
    });

    if (resetError) {
      setStatus('error');
      setError(resetError.message);
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="space-y-4 rounded-lg border border-bronze/30 bg-ink2 p-6 text-center">
        <p className="text-sm text-cream">
          If <span className="font-medium text-gold">{email}</span> has an account, a reset link is
          on its way. Check your inbox.
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
      <button
        type="submit"
        disabled={status === 'sending' || email.length === 0}
        className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/90 disabled:cursor-not-allowed disabled:bg-bronze/40 disabled:text-cream/40"
      >
        {status === 'sending' ? 'Sending…' : 'Send reset link'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
