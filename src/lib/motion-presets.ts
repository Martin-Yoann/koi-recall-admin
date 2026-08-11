// ============================================================
// KOI Admin — Motion Presets
// (shared with KOI-web)
// ============================================================

import type { Variants } from 'framer-motion';

// === Easing Curves ===
export const EASING = {
  bladeIn: [0.16, 1, 0.3, 1],
  bladeOut: [0.4, 0, 1, 1],
  bladeBoth: [0.65, 0, 0.35, 1],
} as const;

// === Transition Presets ===
export const TRANSITION = {
  fast: { duration: 0.15, ease: EASING.bladeIn },
  normal: { duration: 0.25, ease: EASING.bladeIn },
  slow: { duration: 0.35, ease: EASING.bladeIn },
  page: { duration: 0.5, ease: EASING.bladeBoth },
} as const;

// === Variants ===

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION.normal },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASING.bladeOut } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: TRANSITION.normal },
  exit: { opacity: 0, x: -24, transition: { duration: 0.15, ease: EASING.bladeOut } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: TRANSITION.normal },
  exit: { opacity: 0, x: 24, transition: { duration: 0.15, ease: EASING.bladeOut } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: TRANSITION.fast },
  exit: { opacity: 0, y: 8, transition: { duration: 0.1, ease: EASING.bladeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASING.bladeIn },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.15, ease: EASING.bladeOut },
  },
};

export const staggerChildren: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: EASING.bladeIn },
  },
};

export const stepForward: Variants = { ...slideInRight };
export const stepBackward: Variants = { ...slideInLeft };
