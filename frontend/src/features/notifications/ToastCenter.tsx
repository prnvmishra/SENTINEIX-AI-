import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import type { AppNotification, NotificationSeverity } from "@shared/types";
import { toastVariants } from "@/theme/motion";
import { useLiveCase } from "@/hooks/useLiveCase";
import { cn } from "@/utils/cn";

const TOAST_LIFETIME_MS = 6000;

const severityConfig: Record<NotificationSeverity, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "border-primary/40 text-primary" },
  success: { icon: CheckCircle2, className: "border-success/40 text-success" },
  warning: { icon: AlertTriangle, className: "border-warning/40 text-warning" },
  danger: { icon: ShieldAlert, className: "border-danger/40 text-danger" },
};

export function ToastCenter() {
  const { liveNotifications } = useLiveCase();
  const [visible, setVisible] = useState<AppNotification[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const latest = liveNotifications[0];
    if (!latest || seenIds.current.has(latest.id)) return;

    seenIds.current.add(latest.id);
    setVisible((prev) => [latest, ...prev].slice(0, 4));

    const timeout = window.setTimeout(() => {
      setVisible((prev) => prev.filter((n) => n.id !== latest.id));
    }, TOAST_LIFETIME_MS);

    return () => window.clearTimeout(timeout);
  }, [liveNotifications]);

  function dismiss(id: string) {
    setVisible((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {visible.map((notification) => {
          const config = severityConfig[notification.severity];
          const Icon = config.icon;

          return (
            <motion.div
              key={notification.id}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={toastVariants}
              className={cn(
                "glass-panel pointer-events-auto flex gap-2.5 rounded-lg border p-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.6)]",
                config.className,
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-text-primary">{notification.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-secondary">{notification.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(notification.id)}
                aria-label="Dismiss notification"
                className="h-fit shrink-0 rounded p-0.5 text-text-muted transition hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
