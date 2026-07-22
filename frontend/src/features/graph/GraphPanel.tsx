import { Network, Share2 } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { useLiveCase } from "@/hooks/useLiveCase";
import { FraudNetworkGraph } from "@/features/graph/FraudNetworkGraph";

export function GraphPanel() {
  const { graph } = useLiveCase();

  return (
    <GlassPanel noPadding className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        icon={Network}
        title="Fraud Network Graph"
        subtitle="Victims · Scammers · Mule accounts"
        actions={graph && <Badge tone="primary">{graph.nodes.length} entities</Badge>}
      />
      <div className="flex-1 overflow-hidden">
        {!graph ? (
          <EmptyState
            icon={Share2}
            title="No linked entities yet"
            description="Victim, scammer and money-mule account relationships will appear as the case develops."
          />
        ) : (
          <FraudNetworkGraph graph={graph} />
        )}
      </div>
    </GlassPanel>
  );
}
