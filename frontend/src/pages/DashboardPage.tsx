import { DashboardHeader } from "@/features/dashboard/DashboardHeader";
import { DashboardGrid } from "@/features/dashboard/DashboardGrid";
import { TranscriptPanel } from "@/features/transcript/TranscriptPanel";
import { ThreatPanel } from "@/features/threat/ThreatPanel";
import { MapPanel } from "@/features/map/MapPanel";
import { GraphPanel } from "@/features/graph/GraphPanel";
import { BottomPanel } from "@/features/replay/BottomPanel";

export function DashboardPage() {
  return (
    <div className="app-atmosphere relative h-screen w-full overflow-hidden text-text-primary">
      <div className="pointer-events-none absolute inset-0 opacity-30 radar-mesh" />
      <div className="relative flex h-full flex-col">
        <DashboardHeader />
        <div className="relative z-0 flex min-h-0 flex-1 flex-col">
          <DashboardGrid
            transcript={<TranscriptPanel />}
            threat={<ThreatPanel />}
            map={<MapPanel />}
            graph={<GraphPanel />}
            bottom={<BottomPanel />}
          />
        </div>
      </div>
    </div>
  );
}
