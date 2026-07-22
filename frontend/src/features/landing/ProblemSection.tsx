import { AlertOctagon, PhoneOff, Users } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { ScrollReveal } from "@/components/ScrollReveal";
import { staggerContainer, fadeUp } from "@/theme/motion";
import { motion } from "framer-motion";
import { impersonatedAuthorities, manipulationTactics } from "@/mock/landingContent";

export function ProblemSection() {
  return (
    <section id="problem" className="relative border-t border-border bg-surface/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="The Problem"
          title="Digital Arrest scams are escalating fast"
          description="Fraudsters impersonate national authorities, psychologically isolate victims, and extract funds before any agency can react — current systems only respond after the damage is done."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {impersonatedAuthorities.map((authority) => (
            <motion.div key={authority.name} variants={fadeUp}>
              <GlassPanel className="h-full">
                <div className="flex items-center gap-2 text-danger">
                  <AlertOctagon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{authority.name}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{authority.description}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>

        <ScrollReveal delay={0.1} className="mt-14">
          <GlassPanel className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <div className="flex items-center gap-3 text-text-primary sm:flex-col sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-danger/30 bg-danger/10">
                <PhoneOff className="h-5 w-5 text-danger" />
              </div>
              <div>
                <p className="text-sm font-semibold">The psychological playbook</p>
                <p className="text-xs text-text-muted">Every phrase below is a detectable signal</p>
              </div>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {manipulationTactics.map((tactic) => (
                <li
                  key={tactic}
                  className="flex items-start gap-2 rounded-md border border-border bg-surface/60 px-3 py-2 text-xs text-text-secondary"
                >
                  <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  {tactic}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </ScrollReveal>
      </div>
    </section>
  );
}
