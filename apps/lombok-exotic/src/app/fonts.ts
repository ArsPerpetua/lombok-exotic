import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';

/**
 * Storefront typefaces — see DESIGN.md.
 * Fraunces: warm characterful display serif (headings, wordmark).
 * Plus Jakarta Sans: body / UI — an Indonesian typeface.
 * Both self-hosted by next/font, exposed as CSS vars that globals.css composes
 * into --font-display / --font-sans.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});
