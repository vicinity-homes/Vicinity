'use client';

import { createClient } from '@/lib/supabase/client';
import { Password } from '@/lib/zod/auth';
import { useState } from 'react';
import { z } from 'zod';

type Status = 'idle' | 'saving' | 'error';

const ResetSchema = z
  .object({ password: Password, confirm: Password })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ['confirm'],
  });

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setError(null);

    const parsed = ResetSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setStatus('error');
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (updateError) {
      setStatus('error');
      setError(updateError.message);
      return;
    }

    // Force a full reload so server components see the refreshed session.
    window.location.assign('/dashboard');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-bronze/30 bg-ink2 p-6"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium text-cream">New password</span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={status === 'saving'}
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
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={status === 'saving'}
          className="w-full rounded-md border border-bronze/40 bg-ink px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none disabled:opacity-50"
          placeholder="••••••••"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'saving' || password.length === 0 || confirm.length === 0}
        className="w-full rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold/90 disabled:cursor-not-allowed disabled:bg-bronze/40 disabled:text-cream/40"
      >
        {status === 'saving' ? 'Saving…' : 'Save new password'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
