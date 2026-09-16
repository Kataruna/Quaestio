import type { Transition, Variants } from 'motion/react';

/** Shared transition/variant presets so individual components don't each
 * hand-roll their own easing and duration — used across board switches,
 * dialogs, toasts, and list entrances. */

export const quickTransition: Transition = { duration: 0.18, ease: [0.4, 0, 0.2, 1] };

export const fadeSlide: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const scaleFade: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
};

/** For a parent whose children declare `fadeSlide`/`scaleFade` and should
 * stagger in one after another instead of all at once. */
export const staggerChildren: Variants = {
  animate: { transition: { staggerChildren: 0.04 } },
};
