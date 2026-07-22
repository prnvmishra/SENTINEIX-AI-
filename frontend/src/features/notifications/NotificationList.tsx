import { motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import type { AppNotification, NotificationSeverity } from "@shared/types";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/utils/formatTime";

const severityConfig: Record<NotificationSeverity, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-primary border-primary/30 bg-primary/10" },
  success: { icon: CheckCircle2, className: "text-success border-success/30 bg-success/10" },
  warning: { icon: AlertTriangle, className: "text-warning border-warning/30 bg-warning/10" },
  danger: { icon: ShieldAlert, className: "text-danger border-danger/30 bg-danger/10" },
};

export function NotificationList({ notifications, compact = false }: { notifications: AppNotification[]; compact?: boolean }) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="You're all caught up"
        description="Escalations, decision recommendations and system alerts will appear here."
      />
    );
  }

  return (
    <div className={cn("flex flex-col", compact ? "divide-y divide-border" : "gap-2 p-3")}>
      {notifications.map((notification) => {
        const config = severityConfig[notification.severity];
        const Icon = config.icon;

        return (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              "flex gap-2.5",
              compact ? "px-3 py-2.5" : "rounded-lg border border-border bg-surface-raised/60 p-3",
              !notification.read && !compact && "border-primary/30",
            )}
          >
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", config.className)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-text-primary">{notification.title}</p>
                {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">{notification.message}</p>
              <p className="mt-1 font-mono text-[10px] text-text-muted">{formatRelativeTime(notification.timestampMs)}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
