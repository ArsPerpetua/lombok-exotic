'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { getCartAction } from '@/app/[locale]/keranjang/actions';
import { onCartChanged } from '@/lib/cart-events';

export function CartBadge({ label }: { label: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getCartAction()
      .then((cart) => {
        if (active) setCount(cart.itemCount);
      })
      .catch(() => {});
    const unsubscribe = onCartChanged((cart) => setCount(cart.itemCount));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <Link href="/keranjang" className="relative font-medium">
      {label}
      {count != null && count > 0 && (
        <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs text-brand-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
