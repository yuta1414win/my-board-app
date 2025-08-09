'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

// This implementation follows the official Next.js App Router documentation
// for styling with CSS-in-JS libraries like Emotion
export default function EmotionRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache] = useState(() => {
    const cache = createCache({ key: 'css', prepend: true });
    cache.compat = true;
    return cache;
  });

  useServerInsertedHTML(() => {
    const entries = Object.entries(cache.inserted);
    if (entries.length === 0) return null;
    const names = entries
      .filter(([, inserted]) => inserted !== true)
      .map(([n]) => n);
    const styles = names.map((n) => cache.inserted[n]).join('');
    const rules = `@layer mui {${styles}}`;
    
    // Clear the cache for this render
    names.forEach((n) => {
      cache.inserted[n] = true;
    });
    
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: rules,
        }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}