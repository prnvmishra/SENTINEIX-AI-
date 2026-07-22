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

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-bg text-text-primary">
      <Navbar />
      <HeroSection />
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
