import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { Badge } from "@/components/Badge";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { architectureLayers } from "@/mock/landingContent";

export function ArchitectureSection() {
  return (
    <section id="architecture" className="relative px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="System Architecture"
          title="A layered, real-time intelligence stack"
          description="Every layer streams synchronized state to the dashboard — transcript, threat, graph, map and timeline update together, in real time."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="mt-14 flex flex-col items-center"
        >
          {architectureLayers.map((layer, index) => (
            <motion.div key={layer.title} variants={fadeUp} className="w-full">
              <GlassPanel className="w-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">{layer.title}</p>
                  <Badge tone="primary">Layer 0{index + 1}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {layer.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-border bg-surface/70 px-2.5 py-1 font-mono text-[11px] text-text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </GlassPanel>
              {index < architectureLayers.length - 1 && (
                <div className="flex justify-center py-2">
                  <ChevronDown className="h-4 w-4 text-primary/60" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
