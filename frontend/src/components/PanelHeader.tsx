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
    <div className={cn("flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5", className)}>
      <div className="flex items-center gap-2 overflow-hidden">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="flex flex-col overflow-hidden leading-tight">
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-text-primary">{title}</span>
          {subtitle && <span className="truncate text-[10px] text-text-muted">{subtitle}</span>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}
