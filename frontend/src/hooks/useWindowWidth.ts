import { useState, useEffect } from 'react';

export function useWindowWidth(): number {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

/** Returns true when the viewport is narrower than 768px (all iPhones). */
export function useIsMobile(): boolean {
  return useWindowWidth() < 768;
}
