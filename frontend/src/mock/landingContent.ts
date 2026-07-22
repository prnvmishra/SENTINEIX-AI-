import {
  AlertTriangle,
  Brain,
  FileText,
  GitBranch,
  Globe2,
  History,
  LayoutDashboard,
  MapPinned,
  MessageSquareText,
  Network,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavLink {
  id: string;
  label: string;
}

export const navLinks: NavLink[] = [
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "features", label: "Features" },
  { id: "architecture", label: "Architecture" },
  { id: "agents", label: "AI Agents" },
  { id: "stack", label: "Tech Stack" },
  { id: "roadmap", label: "Roadmap" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

export interface HeroStat {
  label: string;
  value: string;
}

export const heroStats: HeroStat[] = [
  { label: "Simulated cases analyzed", value: "12,480+" },
  { label: "Detection accuracy (mock)", value: "94.6%" },
  { label: "Avg. time to flag", value: "8.2s" },
  { label: "Agencies onboarded (pilot)", value: "27" },
];

export interface ImpersonatedAuthority {
  name: string;
  description: string;
}

export const impersonatedAuthorities: ImpersonatedAuthority[] = [
  { name: "CBI", description: "Fake \"digital arrest\" warrants and case numbers" },
  { name: "Police", description: "Threats of local arrest for parcel/KYC violations" },
  { name: "Customs", description: "Claims of illegal items intercepted in courier" },
  { name: "RBI", description: "Fraudulent account freeze and compliance notices" },
  { name: "FedEx / Courier", description: "Fake delivery fraud alerts as the entry hook" },
  { name: "Income Tax / ED", description: "Fabricated money laundering investigations" },
];

export const manipulationTactics: string[] = [
  "\"Don't disconnect the call\" — sustained psychological pressure",
  "\"Stay isolated, don't tell your family\" — cutting off outside verification",
  "\"Turn on Skype / video call\" — staged fake law-enforcement backdrop",
  "\"This is extremely urgent\" — manufactured time pressure",
  "\"Transfer funds for verification\" — the financial extraction step",
  "\"Use this safe government account\" — money mule laundering step",
];

export interface PipelineStage {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const pipelineStages: PipelineStage[] = [
  { title: "Scam Signals", description: "Live call transcript, keywords and behavioral cues ingested in real time.", icon: Radar },
  { title: "Threat Intelligence", description: "Deterministic threat engine scores authority-impersonation, isolation and urgency signals.", icon: ShieldCheck },
  { title: "Fraud Intelligence", description: "Graph intelligence links victims, scammer numbers and money-mule accounts into campaigns.", icon: Network },
  { title: "Decision Intelligence", description: "Explainable recommendations for cyber cell escalation and account freeze actions.", icon: Brain },
  { title: "Investigation Report", description: "Prototype PDF report with evidence, timeline and recommendations for human review.", icon: FileText },
];

export interface FeatureItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const featureItems: FeatureItem[] = [
  { title: "Live Transcript Terminal", description: "Typing-animated transcript with speaker detection, timestamps and keyword highlighting.", icon: MessageSquareText },
  { title: "Explainable Threat Meter", description: "Live threat score with a running feed of exactly why the score changed.", icon: ShieldCheck },
  { title: "Fraud Network Graph", description: "Interactive victim, scammer and money-mule node graph with campaign clustering.", icon: Network },
  { title: "Investigation Replay", description: "Scrub back through any resolved case, timeline-synced with transcript and score.", icon: History },
  { title: "Geospatial Intelligence", description: "Dark, animated India map with live fraud hotspots and historical incident density.", icon: MapPinned },
  { title: "Command Decision Panel", description: "Action-ready recommendations mapped to threat level for the operator on duty.", icon: LayoutDashboard },
  { title: "Analytics Intelligence", description: "Trend, authority and agency performance analytics across the case pipeline.", icon: ScanSearch },
  { title: "Prototype Investigation Report", description: "One-click, disclaimer-backed PDF export summarizing the full case for human review.", icon: FileText },
];

export interface AgentItem {
  name: string;
  role: string;
  description: string;
  icon: LucideIcon;
}

export const agentItems: AgentItem[] = [
  { name: "Transcript Agent", role: "Ingestion", description: "Streams scripted call scenarios line-by-line with speaker and timing metadata.", icon: MessageSquareText },
  { name: "Threat Detection Agent", role: "Scoring", description: "Applies weighted, keyword-driven rules to raise the live threat score.", icon: ShieldCheck },
  { name: "Explainability Agent", role: "Transparency", description: "Converts every score change into a plain-language, phrase-cited reason.", icon: Sparkles },
  { name: "Graph Intelligence Agent", role: "Linking", description: "Builds the victim / scammer / mule-account graph and detects campaigns.", icon: Network },
  { name: "Timeline Agent", role: "Reconstruction", description: "Assembles a scrubbable, chronological record of the entire incident.", icon: History },
  { name: "Decision Agent", role: "Recommendation", description: "Maps the current threat band to concrete, agency-ready next actions.", icon: Brain },
  { name: "Report Generator Agent", role: "Documentation", description: "Compiles evidence, indicators and recommendations into an investigation report.", icon: FileText },
];

export const architectureLayers = [
  {
    title: "Client — React 19 Command Center",
    items: ["Live dashboard grid", "Landing & auth", "Socket.IO client", "jsPDF report export"],
  },
  {
    title: "Real-time Gateway — Socket.IO",
    items: ["case:start / transcript:line", "threat:update / graph:update", "map:ping / timeline:event"],
  },
  {
    title: "Mock Intelligence Engine — Node + Express",
    items: ["Transcript · Threat · Explainability", "Graph · Timeline · Decision", "Report Generator"],
  },
  {
    title: "Data Layer — Mock Scenarios & Datasets",
    items: ["Scripted scam scenarios", "Historical case archive", "India hotspot dataset"],
  },
];

export interface TechStackItem {
  name: string;
  category: string;
}

export const techStack: TechStackItem[] = [
  { name: "React 19", category: "Frontend" },
  { name: "TypeScript", category: "Language" },
  { name: "Vite", category: "Tooling" },
  { name: "Tailwind CSS", category: "Styling" },
  { name: "Framer Motion", category: "Animation" },
  { name: "React Router", category: "Routing" },
  { name: "React Flow", category: "Graph" },
  { name: "React Leaflet", category: "Geospatial" },
  { name: "Recharts", category: "Analytics" },
  { name: "Lucide Icons", category: "Iconography" },
  { name: "Socket.IO", category: "Real-time" },
  { name: "jsPDF", category: "Reporting" },
  { name: "Node.js", category: "Backend Runtime" },
  { name: "Express", category: "Backend Framework" },
];

export interface RoadmapMilestone {
  phase: string;
  title: string;
  description: string;
  status: "shipped" | "in-progress" | "planned";
}

export const roadmapMilestones: RoadmapMilestone[] = [
  { phase: "01", title: "Detection Engine", description: "Real-time transcript, threat scoring and explainability pipeline.", status: "shipped" },
  { phase: "02", title: "Investigation Suite", description: "Fraud graph, geospatial intelligence and case replay for investigators.", status: "shipped" },
  { phase: "03", title: "Decision & Reporting", description: "Command decision panel and prototype investigation PDF report.", status: "in-progress" },
  { phase: "04", title: "Agency Integrations", description: "Bank risk APIs, telecom signalling hooks and cyber cell case management sync.", status: "planned" },
  { phase: "05", title: "National Rollout", description: "Multi-language support, regional hotspot tuning and state cyber cell onboarding.", status: "planned" },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "Is SentinelX AI using real AI models or live surveillance?",
    answer:
      "No. This prototype uses a deterministic, rule-based Mock Intelligence Engine over scripted scam scenarios to demonstrate the detection-to-decision workflow. No real calls, personal data, or third-party AI models are used.",
  },
  {
    question: "How does the threat score work?",
    answer:
      "The score starts at zero and increases based on explainable signal categories — authority impersonation, isolation requests, urgency language, money transfer and Skype/video verification requests — each with a visible, phrase-cited reason.",
  },
  {
    question: "Who is this platform designed for?",
    answer:
      "Citizens, Cyber Crime Officers, Investigators, Telecom Operators, Bank Risk teams and Government Administrators — each with a role-aware view of the same incident intelligence.",
  },
  {
    question: "Can this integrate with real telecom or banking systems?",
    answer:
      "The architecture is designed for it: the Socket.IO gateway and REST API layers are built to be swapped for real telephony/STT and banking risk feeds without changing the frontend intelligence UI.",
  },
  {
    question: "Is the generated PDF report legally admissible?",
    answer:
      "No. It is explicitly labelled a Prototype Investigation Report for demonstration purposes only and requires human review before any operational use.",
  },
];

export const glossaryStat = { icon: Globe2, label: "Built for India-first fraud patterns" };
export const alertIcon: LucideIcon = AlertTriangle;
export const branchIcon: LucideIcon = GitBranch;
