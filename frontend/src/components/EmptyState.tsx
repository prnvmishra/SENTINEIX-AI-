import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, className, action }: EmptyStateProps) {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center gap-2 p-8 text-center", className)}>
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-surface-raised">
        <Icon className="h-5 w-5 text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {description && <p className="max-w-xs text-xs text-text-muted">{description}</p>}
      {action}
    </div>
  );
}
