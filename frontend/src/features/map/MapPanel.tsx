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
  const latestPing = mapPings.length > 0 ? mapPings[mapPings.length - 1] : null;

  return (
    <GlassPanel noPadding className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        icon={MapPinned}
        title="Geospatial Intelligence"
        subtitle={
          latestPing
            ? `${latestPing.lat.toFixed(5)}, ${latestPing.lng.toFixed(5)} · zoom to device`
            : "Live device GPS + India hotspots"
        }
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
