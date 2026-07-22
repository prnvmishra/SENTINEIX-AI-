import { motion } from "framer-motion";
import { Check, CircleDashed, Loader2 } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { Badge } from "@/components/Badge";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { roadmapMilestones } from "@/mock/landingContent";
import type { RoadmapMilestone } from "@/mock/landingContent";

const statusConfig: Record<RoadmapMilestone["status"], { label: string; tone: "success" | "primary" | "neutral"; icon: typeof Check }> = {
  shipped: { label: "Shipped", tone: "success", icon: Check },
  "in-progress": { label: "In Progress", tone: "primary", icon: Loader2 },
  planned: { label: "Planned", tone: "neutral", icon: CircleDashed },
};

export function RoadmapSection() {
  return (
    <section id="roadmap" className="relative px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="Roadmap"
          title="From detection prototype to national rollout"
          description="The engineering roadmap that takes SentinelX AI from a hackathon prototype to an agency-integrated intelligence platform."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="relative mt-14 flex flex-col gap-4"
        >
          <div className="absolute bottom-4 left-[19px] top-4 w-px bg-border-strong" aria-hidden />
          {roadmapMilestones.map((milestone) => {
            const status = statusConfig[milestone.status];
            const StatusIcon = status.icon;
            return (
              <motion.div key={milestone.phase} variants={fadeUp} className="relative flex gap-4 pl-0">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-xs text-text-secondary">
                  {milestone.phase}
                </div>
                <GlassPanel className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary">{milestone.title}</p>
                    <Badge tone={status.tone}>
                      <StatusIcon className={milestone.status === "in-progress" ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{milestone.description}</p>
                </GlassPanel>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
