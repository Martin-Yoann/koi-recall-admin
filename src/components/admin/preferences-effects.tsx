'use client';

import { useEffect } from 'react';

import { preferences } from '@/lib/preferences';

/**
 * Applies document-level preference side effects that have no React render
 * target: the page `lang` attribute and the reduced-motion switch. Values are
 * also applied pre-hydration by the inline script in `app/layout.tsx` so the
 * first paint already matches; this keeps them in sync afterwards.
 */
export function PreferencesEffects() {
  const locale = preferences.locale.use();
  const reduceMotion = preferences.reduceMotion.use();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (reduceMotion) document.documentElement.setAttribute('data-reduce-motion', 'true');
    else document.documentElement.removeAttribute('data-reduce-motion');
  }, [reduceMotion]);

  return null;
}
