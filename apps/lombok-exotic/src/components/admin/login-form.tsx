'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

export function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn.email({ email: email.trim(), password });
    if (res.error) {
      setError('Email atau kata sandi salah.');
      setBusy(false);
      return;
    }
    window.location.href = '/admin';
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2 text-base"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Kata Sandi</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2 text-base"
        />
      </label>
      {error && <p className="text-sm text-brand">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-brand px-5 py-2.5 font-medium text-brand-foreground disabled:opacity-60"
      >
        {busy ? 'Masuk…' : 'Masuk'}
      </button>
    </form>
  );
}
