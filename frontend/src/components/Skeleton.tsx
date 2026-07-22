import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-surface-raised via-border to-surface-raised",
        className,
      )}
    />
  );
}

export function LoadingState({ label = "Loading intelligence feed..." }: { label?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-primary" />
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
