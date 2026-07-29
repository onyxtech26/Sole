import { useEffect, useState } from 'react';

/**
 * Live match for a CSS media query.
 *
 * Most of the responsive work in this app is done in `index.css`, which is
 * cheaper and cannot desync from paint. This hook exists for the cases CSS
 * genuinely cannot express — where a phone needs *different markup*, not
 * different styling, such as the bookings table becoming a card list.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}
