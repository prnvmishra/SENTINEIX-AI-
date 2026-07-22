import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { Building2, ShieldAlert, Target, User } from "lucide-react";
import type { GraphNodeType } from "@shared/types";
import { cn } from "@/utils/cn";

export interface EntityNodeData {
  type: GraphNodeType;
  label: string;
  detail: string;
  riskScore: number;
}

const typeConfig: Record<GraphNodeType, { icon: typeof User; className: string }> = {
  victim: { icon: User, className: "border-success/50 bg-success/10 text-success" },
  scammer: { icon: ShieldAlert, className: "border-danger/50 bg-danger/10 text-danger" },
  mule_account: { icon: Building2, className: "border-warning/50 bg-warning/10 text-warning" },
  campaign: { icon: Target, className: "border-primary/60 bg-primary/15 text-primary" },
};

export function EntityNode({ data }: NodeProps<EntityNodeData>) {
  const config = typeConfig[data.type];
  const Icon = config.icon;

  return (
    <div className={cn("w-44 rounded-lg border px-3 py-2 backdrop-blur", "bg-surface/90", config.className)}>
      <Handle type="target" position={Position.Left} className="!bg-border-strong" />
      <Handle type="source" position={Position.Right} className="!bg-border-strong" />
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate text-[11px] font-semibold text-text-primary">{data.label}</span>
      </div>
      <p className="mt-1 truncate text-[10px] text-text-muted">{data.detail}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full" style={{ width: `${data.riskScore}%`, backgroundColor: "currentColor" }} />
        </div>
        <span className="font-mono text-[9px] text-text-muted">{data.riskScore}</span>
      </div>
    </div>
  );
}
