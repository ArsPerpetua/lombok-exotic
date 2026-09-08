'use client';

import { useEffect } from 'react';

/**
 * One mount per page. Reveals `.reveal` elements as they scroll into view
 * (fade + rise) and drives the hero ikat-field parallax (`#hero-ikat`).
 * Elements already near the viewport when JS runs are revealed with no flash;
 * everything is force-revealed after 2.2s as a safety net. Fully inert under
 * `prefers-reduced-motion`.
 */
export function ScrollReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

    // Reveal what's already visible before gating, so it never flashes.
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.classList.add('reveal-in');
      }
    });
    root.classList.add('js');

    let io: IntersectionObserver | undefined;
    const pending = els.filter((el) => !el.classList.contains('reveal-in'));
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('reveal-in');
              io?.unobserve(e.target);
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      );
      pending.forEach((el) => io!.observe(el));
    } else {
      pending.forEach((el) => el.classList.add('reveal-in'));
    }

    const safety = window.setTimeout(() => {
      document
        .querySelectorAll('.reveal:not(.reveal-in)')
        .forEach((el) => el.classList.add('reveal-in'));
    }, 2200);

    const pat = document.getElementById('hero-ikat');
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        if (pat) pat.style.transform = `translateY(${y * 0.12}px) scale(1.02)`;
        raf = 0;
      });
    };
    if (pat && !reduce) window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io?.disconnect();
      window.clearTimeout(safety);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return null;
}
