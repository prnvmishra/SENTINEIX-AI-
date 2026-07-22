import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/Button";
import { ScrollReveal } from "@/components/ScrollReveal";

const contactDetails = [
  { icon: Mail, label: "operations@sentinelx.ai" },
  { icon: Phone, label: "1930 · National Cyber Crime Helpline" },
  { icon: MapPin, label: "Indian Cyber Crime Coordination Centre (I4C), New Delhi" },
];

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section id="contact" className="relative px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow="Contact"
          title="Request a walkthrough for your agency"
          description="This is a hackathon prototype — reach out to discuss a pilot integration with your cyber cell, bank or telecom risk team."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          <ScrollReveal>
            <div className="flex h-full flex-col gap-4">
              {contactDetails.map((detail) => {
                const Icon = detail.icon;
                return (
                  <GlassPanel key={detail.label} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-text-secondary">{detail.label}</span>
                  </GlassPanel>
                );
              })}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <GlassPanel>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center gap-3 py-12 text-center"
                >
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="text-sm font-medium text-text-primary">Request received</p>
                  <p className="max-w-xs text-xs text-text-muted">
                    Thank you — this prototype form does not send real data, but in production this would route to
                    our operations desk.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                      Full name
                      <input
                        required
                        type="text"
                        placeholder="Officer Ananya Rao"
                        className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                      Organization
                      <input
                        required
                        type="text"
                        placeholder="Cyber Crime Cell, Maharashtra"
                        className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                    Work email
                    <input
                      required
                      type="email"
                      placeholder="you@agency.gov.in"
                      className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                    What would you like to discuss?
                    <textarea
                      required
                      rows={4}
                      placeholder="Tell us about your use case..."
                      className="resize-none rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary"
                    />
                  </label>
                  <Button type="submit" className="self-start">
                    Send request
                  </Button>
                </form>
              )}
            </GlassPanel>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
