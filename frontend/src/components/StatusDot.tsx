import { cn } from "@/utils/cn";

type StatusTone = "success" | "warning" | "danger" | "neutral";

interface StatusDotProps {
  tone?: StatusTone;
  pulse?: boolean;
  label?: string;
  className?: string;
}

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-text-muted",
};

export function StatusDot({ tone = "neutral", pulse = false, label, className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", toneClasses[tone])} />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", toneClasses[tone])} />
      </span>
      {label && <span className="text-[11px] text-text-secondary">{label}</span>}
    </span>
  );
}
