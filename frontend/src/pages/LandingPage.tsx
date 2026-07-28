import {
  AgentsSection,
  ArchitectureSection,
  ContactSection,
  DemoPreviewSection,
  FaqSection,
  FeaturesSection,
  Footer,
  HeroSection,
  Navbar,
  ProblemSection,
  RoadmapSection,
  SolutionSection,
  TechStackSection,
} from "@/features/landing";
import { GlassPanel } from "@/components/GlassPanel";
import { heroStats } from "@/mock/landingContent";

export function LandingPage() {
  return (
    <div className="relative min-h-screen app-atmosphere text-text-primary">
      <Navbar />
      <HeroSection />

      {/* Stats live below the first viewport — keeps the hero brand-first */}
      <section className="relative border-y border-border/60 bg-surface/30 px-6 py-10 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4">
          {heroStats.map((stat) => (
            <GlassPanel key={stat.label} className="flex flex-col items-center gap-1 py-5 text-center">
              <span className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">{stat.value}</span>
              <span className="text-[11px] leading-tight text-text-muted">{stat.label}</span>
            </GlassPanel>
          ))}
        </div>
      </section>

      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <ArchitectureSection />
      <AgentsSection />
      <TechStackSection />
      <DemoPreviewSection />
      <RoadmapSection />
      <FaqSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
