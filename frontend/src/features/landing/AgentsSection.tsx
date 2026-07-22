import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { Badge } from "@/components/Badge";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { agentItems } from "@/mock/landingContent";

export function AgentsSection() {
  return (
    <section id="agents" className="relative border-t border-border bg-surface/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Mock Intelligence Engine"
          title="Seven modular agents, fully explainable"
          description="Each agent has a single responsibility and a deterministic, rule-based implementation — no black-box models."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {agentItems.map((agent) => {
            const Icon = agent.icon;
            return (
              <motion.div key={agent.name} variants={fadeUp}>
                <GlassPanel className="h-full">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge tone="neutral">{agent.role}</Badge>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-text-primary">{agent.name}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{agent.description}</p>
                </GlassPanel>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mt-8 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-text-secondary">
            <span className="font-semibold text-warning">Transparency note:</span> all agents operate on scripted,
            hand-authored mock scenarios using deterministic keyword and rule-based logic. This is intentional — it
            keeps every decision explainable and auditable, which matters more than raw model sophistication in a
            law-enforcement context.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
