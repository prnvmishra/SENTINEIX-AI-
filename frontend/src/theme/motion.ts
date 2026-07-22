import type { Transition, Variants } from "framer-motion";

export const easeOut: Transition["ease"] = [0.16, 1, 0.3, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: easeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: easeOut } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const panelMount: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: easeOut } },
  exit: { opacity: 0, x: 24, transition: { duration: 0.2 } },
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, y: -12, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: easeOut } },
  exit: { opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.15 } },
};
