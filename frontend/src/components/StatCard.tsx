import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { GlassPanel } from "@/components/GlassPanel";

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: string;
  trendTone?: "success" | "danger" | "neutral";
  className?: string;
}

const trendToneClasses: Record<NonNullable<StatCardProps["trendTone"]>, string> = {
  success: "text-success",
  danger: "text-danger",
  neutral: "text-text-muted",
};

export function StatCard({ label, value, icon: Icon, trend, trendTone = "neutral", className }: StatCardProps) {
  return (
    <GlassPanel className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>
      <span className="text-2xl font-semibold text-text-primary">{value}</span>
      {trend && <span className={cn("text-xs font-medium", trendToneClasses[trendTone])}>{trend}</span>}
    </GlassPanel>
  );
}
