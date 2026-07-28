import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PanelHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PanelHeader({ icon: Icon, title, subtitle, actions, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b border-border/80 bg-gradient-to-r from-surface-raised/40 to-transparent px-3.5 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </span>
        <div className="flex min-w-0 flex-col overflow-hidden leading-tight">
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-text-primary">{title}</span>
          {subtitle && <span className="truncate text-[10px] text-text-muted">{subtitle}</span>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}
