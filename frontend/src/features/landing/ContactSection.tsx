import { useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { Button } from "@/components/Button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { isEmailJsConfigured, sendContactRequest } from "@/services/emailjs";

const contactDetails = [
  { icon: Mail, label: "operations@sentinelx.ai" },
  { icon: Phone, label: "1930 · National Cyber Crime Helpline" },
  { icon: MapPin, label: "Indian Cyber Crime Coordination Centre (I4C), New Delhi" },
];

const inputClass =
  "rounded-xl border border-border-strong bg-surface/80 px-3 py-2.5 text-sm text-text-primary outline-none transition duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ContactSection() {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await sendContactRequest({ name, organization, email, message });
      setSubmitted(true);
      setName("");
      setOrganization("");
      setEmail("");
      setMessage("");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Unable to send your request.";
      setError(
        raw.includes("not configured")
          ? "Email delivery is not configured yet. Add your EmailJS keys to frontend/.env and restart the dev server."
          : "Could not send the request. Check your EmailJS template/service keys and try again.",
      );
    } finally {
      setSubmitting(false);
    }
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
                  <GlassPanel key={detail.label} className="flex items-center gap-3 transition-transform duration-300 hover:-translate-y-0.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-text-secondary">{detail.label}</span>
                  </GlassPanel>
                );
              })}
              {!isEmailJsConfigured && (
                <p className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
                  EmailJS keys missing — set <span className="font-mono">VITE_EMAILJS_*</span> in{" "}
                  <span className="font-mono">frontend/.env</span> to enable real delivery.
                </p>
              )}
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
                  <p className="text-sm font-medium text-text-primary">Request sent</p>
                  <p className="max-w-xs text-xs text-text-muted">
                    Thanks — your message is on its way to the SentinelX operations inbox. We&apos;ll get back to you
                    shortly.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSubmitted(false)}
                  >
                    Send another
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                      Full name
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Officer Ananya Rao"
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                      Organization
                      <input
                        required
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Cyber Crime Cell, Maharashtra"
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                    Work email
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@agency.gov.in"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
                    What would you like to discuss?
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your use case..."
                      className={`${inputClass} resize-none`}
                    />
                  </label>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" disabled={submitting || !isEmailJsConfigured} className="self-start">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Send request"
                    )}
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
