import { DashboardHeader } from "@/features/dashboard/DashboardHeader";
import { DashboardGrid } from "@/features/dashboard/DashboardGrid";
import { TranscriptPanel } from "@/features/transcript/TranscriptPanel";
import { ThreatPanel } from "@/features/threat/ThreatPanel";
import { MapPanel } from "@/features/map/MapPanel";
import { GraphPanel } from "@/features/graph/GraphPanel";
import { BottomPanel } from "@/features/replay/BottomPanel";

export function DashboardPage() {
  return (
    <div className="h-screen w-full bg-bg text-text-primary">
      <DashboardHeader />
      <DashboardGrid
        transcript={<TranscriptPanel />}
        threat={<ThreatPanel />}
        map={<MapPanel />}
        graph={<GraphPanel />}
        bottom={<BottomPanel />}
      />
    </div>
  );
}
