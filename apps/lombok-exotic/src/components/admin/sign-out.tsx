'use client';

import { useState } from 'react';
import { signOut } from '@/lib/auth-client';

export function AdminSignOut() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        window.location.href = '/admin/login';
      }}
      className="mt-2 text-brand hover:underline disabled:opacity-50"
    >
      Keluar
    </button>
  );
}
