import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { fadeUp } from "@/theme/motion";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, align = "center", className }: SectionHeadingProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className={cn("flex flex-col gap-3", align === "center" ? "items-center text-center" : "items-start text-left", className)}
    >
      {eyebrow && (
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</span>
      )}
      <h2 className="text-3xl font-semibold text-text-primary sm:text-4xl">{title}</h2>
      {description && (
        <p className={cn("max-w-2xl text-base text-text-secondary", align === "center" && "mx-auto")}>{description}</p>
      )}
    </motion.div>
  );
}
