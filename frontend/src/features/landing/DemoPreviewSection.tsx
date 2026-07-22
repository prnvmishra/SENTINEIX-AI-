import { motion } from "framer-motion";
import { Activity, MapPinned, MessageSquareText, Network, ShieldAlert } from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { GlassPanel } from "@/components/GlassPanel";
import { Badge } from "@/components/Badge";
import { fadeUp } from "@/theme/motion";

const previewTranscript = [
  { speaker: "Scammer", text: "This is CBI Officer Sharma. Do not disconnect this call." },
  { speaker: "Victim", text: "I— I haven't done anything wrong, sir." },
  { speaker: "Scammer", text: "A parcel under your name contains illegal items. Transfer to the safe account now." },
];

export function DemoPreviewSection() {
  return (
    <section id="demo" className="relative border-t border-border bg-surface/40 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Live Preview"
          title="The command center, in action"
          description="A simplified preview of the real dashboard — live transcript, explainable threat scoring, fraud graph and geospatial intelligence, all synchronized over Socket.IO."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          className="mt-14"
        >
          <GlassPanel glow className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg/60 p-3 lg:col-span-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                <MessageSquareText className="h-3.5 w-3.5 text-primary" /> LIVE TRANSCRIPT
              </div>
              <div className="flex flex-col gap-2 font-mono text-[11px] leading-relaxed">
                {previewTranscript.map((line, i) => (
                  <motion.p
                    key={line.text}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.25 }}
                    className={line.speaker === "Scammer" ? "text-danger" : "text-text-secondary"}
                  >
                    <span className="text-text-muted">[{line.speaker}]</span> {line.text}
                  </motion.p>
                ))}
                <span className="h-3 w-1.5 animate-pulse bg-primary" />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg/60 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                <ShieldAlert className="h-3.5 w-3.5 text-danger" /> THREAT SCORE
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-2">
                <span className="text-4xl font-bold text-danger">78</span>
                <Badge tone="danger">HIGH THREAT</Badge>
              </div>
              <div className="flex flex-col gap-1 text-[10px] text-text-muted">
                <p>+20 Authority impersonation detected</p>
                <p>+25 Safe account transfer request</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-1 flex-col gap-2 rounded-lg border border-border bg-bg/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <Network className="h-3.5 w-3.5 text-primary" /> FRAUD GRAPH
                </div>
                <div className="flex flex-1 items-center justify-center gap-4 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-success/40 bg-success/10 text-[9px] text-success">
                    V
                  </div>
                  <div className="h-px w-8 bg-border-strong" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-danger/40 bg-danger/10 text-[9px] text-danger">
                    S
                  </div>
                  <div className="h-px w-8 bg-border-strong" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-warning/40 bg-warning/10 text-[9px] text-warning">
                    M
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg/60 p-3 text-xs text-text-secondary">
                <MapPinned className="h-3.5 w-3.5 text-primary" /> Hotspot ping · Lucknow, UP
                <Activity className="ml-auto h-3.5 w-3.5 animate-pulse text-primary" />
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </section>
  );
}
