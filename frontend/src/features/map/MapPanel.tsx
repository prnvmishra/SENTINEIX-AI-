import { MapPinned } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { LoadingState } from "@/components/Skeleton";
import { Badge } from "@/components/Badge";
import { useLiveCase } from "@/hooks/useLiveCase";
import { useHotspots } from "@/features/map/useHotspots";
import { IndiaMap } from "@/features/map/IndiaMap";

export function MapPanel() {
  const { hotspots, isLoading } = useHotspots();
  const { mapPings } = useLiveCase();

  return (
    <GlassPanel noPadding className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        icon={MapPinned}
        title="Geospatial Intelligence"
        subtitle="India fraud hotspot map"
        actions={mapPings.length > 0 && <Badge tone="danger" dot>{mapPings.length} live signals</Badge>}
      />
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? (
          <LoadingState label="Loading hotspot intelligence..." />
        ) : (
          <IndiaMap hotspots={hotspots} activePings={mapPings} />
        )}
      </div>
    </GlassPanel>
  );
}
