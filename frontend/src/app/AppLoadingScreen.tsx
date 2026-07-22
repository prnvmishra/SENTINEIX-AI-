import { ShieldHalf } from "lucide-react";

export function AppLoadingScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-bg text-text-primary">
      <ShieldHalf className="h-7 w-7 animate-pulse text-primary" />
      <p className="text-xs text-text-muted">Loading SentinelX AI...</p>
    </div>
  );
}
