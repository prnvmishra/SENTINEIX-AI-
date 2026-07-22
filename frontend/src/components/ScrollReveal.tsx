import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Variants } from "framer-motion";
import { fadeUp } from "@/theme/motion";
import { cn } from "@/utils/cn";

interface ScrollRevealProps {
  children: ReactNode;
  variants?: Variants;
  delay?: number;
  className?: string;
}

export function ScrollReveal({ children, variants = fadeUp, delay = 0, className }: ScrollRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={variants}
      transition={{ delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
