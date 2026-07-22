import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Radar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { GlassPanel } from "@/components/GlassPanel";
import { fadeUp, staggerContainer } from "@/theme/motion";
import { heroStats } from "@/mock/landingContent";
import { ROUTES } from "@/app/routes";

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24">
      <div className="grid-lines-bg absolute inset-0 opacity-40" />
      <div className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]" />
      <div className="absolute right-0 top-0 h-[360px] w-[360px] rounded-full bg-danger/10 blur-[120px]" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 text-center"
      >
        <motion.div variants={fadeUp}>
          <Badge tone="primary" dot>
            National Fraud Intelligence Platform
          </Badge>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          From Detection to
          <span className="block text-primary text-glow-primary">Decision Intelligence</span>
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-base text-text-secondary sm:text-lg">
          SentinelX AI converts incoming Digital Arrest scam signals into threat intelligence, fraud intelligence and
          investigation-ready decision intelligence — built for Cyber Crime Cells, Banks, Telecom Operators and
          Government Agencies.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" onClick={() => navigate(ROUTES.login)}>
            Access Console <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })}
          >
            <PlayCircle className="h-4 w-4" /> View Architecture
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-16 grid w-full grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {heroStats.map((stat) => (
            <GlassPanel key={stat.label} className="flex flex-col items-center gap-1 py-4">
              <span className="text-xl font-bold text-primary sm:text-2xl">{stat.value}</span>
              <span className="text-center text-[11px] leading-tight text-text-muted">{stat.label}</span>
            </GlassPanel>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 text-xs text-text-muted"
      >
        <Radar className="h-3.5 w-3.5 text-primary" /> Scroll to explore the intelligence pipeline
      </motion.div>
    </section>
  );
}
