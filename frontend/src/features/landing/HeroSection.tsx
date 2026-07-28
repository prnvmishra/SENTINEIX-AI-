import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { fadeUp, staggerContainer } from "@/theme/motion";
import { ROUTES } from "@/app/routes";
import { HeroCanvas } from "./HeroCanvas";

export function HeroSection() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const brandX = useTransform(sx, [-0.5, 0.5], [14, -14]);
  const brandY = useTransform(sy, [-0.5, 0.5], [10, -10]);
  const glowX = useTransform(sx, [-0.5, 0.5], ["42%", "58%"]);
  const glowY = useTransform(sy, [-0.5, 0.5], ["38%", "52%"]);

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(nx);
    my.set(ny);
  }

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#070b14]" />
      <motion.div
        className="pointer-events-none absolute h-[55vmax] w-[55vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: glowX,
          top: glowY,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 68%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--color-border) 45%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-border) 45%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 55% 45%, black 20%, transparent 75%)",
        }}
      />

      <HeroCanvas />

      {/* Depth vignette so copy stays readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070b14]/92 via-[#070b14]/55 to-[#070b14]/25 sm:via-[#070b14]/40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#070b14] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#070b14] via-[#070b14]/80 to-transparent" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        style={{ x: brandX, y: brandY }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-start px-6 pb-24 pt-28 sm:px-10 lg:max-w-7xl"
      >
        <motion.p
          variants={fadeUp}
          className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-primary/90"
        >
          National Fraud Intelligence Platform
        </motion.p>

        <motion.p
          variants={fadeUp}
          className="mt-5 font-display text-[clamp(3rem,9vw,6.25rem)] font-extrabold leading-[0.92] tracking-[-0.045em] text-text-primary"
        >
          SENTINEL
          <span className="text-primary text-glow-primary">X</span>
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="mt-7 max-w-xl text-xl font-semibold leading-snug tracking-tight text-text-primary sm:text-2xl lg:text-3xl"
        >
          From detection to decision intelligence
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
          Turn Digital Arrest scam signals into live threat scores, fraud networks, and investigation-ready
          reports — for cyber cells, banks, and agencies.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
          <Button size="lg" onClick={() => navigate(ROUTES.login)}>
            Access Console <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })}
          >
            View Architecture
          </Button>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 text-sm text-text-secondary">
          Built by <span className="font-semibold text-primary">Pranav Mishra</span>
        </motion.p>

        <motion.p
          variants={fadeUp}
          className="mt-8 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted md:block"
        >
          Move cursor · click to ping signals
        </motion.p>
      </motion.div>

      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-text-muted transition hover:text-primary"
        aria-label="Scroll to explore"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Explore</span>
        <ChevronDown className="h-4 w-4 animate-[float-slow_2.4s_ease-in-out_infinite]" />
      </motion.button>
    </section>
  );
}
