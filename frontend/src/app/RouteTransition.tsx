import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeIn } from "@/theme/motion";

export function RouteTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" exit="hidden" variants={fadeIn}>
      {children}
    </motion.div>
  );
}
