import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { pageTransition } from "@/theme/motion";

export function RouteTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
      className="min-h-full will-change-transform"
    >
      {children}
    </motion.div>
  );
}
