import { useEffect, useState } from "react";

/**
 * Subtle scroll-driven parallax. Returns a transform string ready to drop
 * into a style prop. GPU-accelerated, rAF-throttled, passive listener.
 * Collapses to no-op when the user prefers reduced motion.
 */
export function useParallax(speed: number, max = 80): string {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    let latest = window.scrollY;
    const tick = () => {
      raf = 0;
      const next = Math.max(-max, Math.min(max, latest * speed));
      setOffset(next);
    };
    const onScroll = () => {
      latest = window.scrollY;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed, max]);

  return `translate3d(0, ${offset}px, 0)`;
}

/** Returns current scrollY (rAF-throttled). Useful for header tightening. */
export function useScrollY(): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let latest = window.scrollY;
    const tick = () => {
      raf = 0;
      setY(latest);
    };
    const onScroll = () => {
      latest = window.scrollY;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}
