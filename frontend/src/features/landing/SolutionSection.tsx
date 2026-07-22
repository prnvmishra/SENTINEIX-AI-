import { motion } from "framer-motion";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { pipelineStages } from "@/mock/landingContent";

export function SolutionSection() {
  return (
    <section id="solution" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The Solution"
          title="One pipeline, from signal to decision"
          description="SentinelX AI converts a live conversation into a fully explainable investigation record in five deterministic stages."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-5"
        >
          {pipelineStages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <motion.div key={stage.title} variants={fadeUp}>
                <GlassPanel className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-mono text-xs text-text-muted">0{index + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{stage.title}</p>
                  <p className="text-xs leading-relaxed text-text-secondary">{stage.description}</p>
                </GlassPanel>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
