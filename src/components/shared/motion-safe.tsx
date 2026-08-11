'use client';

// ============================================================
// KOI Admin — Motion-Safe Wrapper
// (shared with KOI-web)
// ============================================================

import { motion, type Variants } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { useState, useEffect } from 'react';
import React from 'react';

type AllowedVariant = 'fadeIn' | 'slideInRight' | 'slideInLeft' | 'slideUp' | 'scaleIn';

interface MotionSafeProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  variant: AllowedVariant;
  children: React.ReactNode;
}

const variantMap: Record<AllowedVariant, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideInRight: {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
  },
  slideUp: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
};

export function MotionSafe({ variant, children, ...props }: MotionSafeProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (reduceMotion) {
    return <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  return (
    <motion.div
      variants={variantMap[variant]}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
