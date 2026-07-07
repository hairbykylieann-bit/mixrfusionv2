import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
  once?: boolean;
}

const EDITORIAL_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-triggered editorial fade-up. Fires once by default.
 * Collapses to an instant render when prefers-reduced-motion is set.
 */
export function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  y = 18,
  className,
  once = true,
}: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "0px 0px -80px 0px" }}
      transition={{ duration, delay, ease: EDITORIAL_EASE }}
    >
      {children}
    </motion.div>
  );
}
