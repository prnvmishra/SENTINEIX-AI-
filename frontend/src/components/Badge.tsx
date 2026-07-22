import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

const toneClasses: Record<BadgeTone, string> = {
  primary: "bg-primary/10 text-primary border-primary/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  neutral: "bg-surface-raised text-text-secondary border-border-strong",
};

const dotClasses: Record<BadgeTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-text-muted",
};

export function Badge({ className, tone = "neutral", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}
