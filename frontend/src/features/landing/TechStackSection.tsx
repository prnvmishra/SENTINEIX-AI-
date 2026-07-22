import { motion } from "framer-motion";
import { SectionHeading } from "@/components/SectionHeading";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { techStack } from "@/mock/landingContent";

export function TechStackSection() {
  return (
    <section id="stack" className="relative px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading eyebrow="Technology Stack" title="Built with a modern, production-grade toolkit" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="mt-12 flex flex-wrap justify-center gap-3"
        >
          {techStack.map((tech) => (
            <motion.div
              key={tech.name}
              variants={fadeUp}
              className="group flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 transition-colors hover:border-primary/40"
            >
              <span className="text-sm font-medium text-text-primary">{tech.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-text-muted">{tech.category}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
