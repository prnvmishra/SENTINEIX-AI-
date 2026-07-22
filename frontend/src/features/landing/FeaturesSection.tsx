import { motion } from "framer-motion";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { featureItems } from "@/mock/landingContent";

export function FeaturesSection() {
  return (
    <section id="features" className="relative border-t border-border bg-surface/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Platform Features"
          title="Everything an investigation team needs, in one console"
          description="A single command center spanning detection, investigation, geospatial intelligence and reporting."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {featureItems.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={fadeUp}>
                <GlassPanel className="group h-full transition-colors hover:border-primary/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-strong bg-surface-raised transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-text-primary">{feature.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{feature.description}</p>
                </GlassPanel>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
