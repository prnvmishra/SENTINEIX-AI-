import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { ScrollReveal } from "@/components/ScrollReveal";
import { cn } from "@/utils/cn";
import { faqItems } from "@/mock/landingContent";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative border-t border-border bg-surface/40 px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />

        <div className="mt-12 flex flex-col gap-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <ScrollReveal key={item.question} delay={index * 0.05}>
                <GlassPanel noPadding className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left"
                  >
                    <span className="text-sm font-medium text-text-primary">{item.question}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", isOpen && "rotate-180 text-primary")}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-xs leading-relaxed text-text-secondary">{item.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassPanel>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
