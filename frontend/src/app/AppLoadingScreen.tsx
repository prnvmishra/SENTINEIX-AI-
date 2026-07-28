import { ShieldHalf } from "lucide-react";

export function AppLoadingScreen() {
  return (
    <div className="app-atmosphere relative flex h-screen w-full flex-col items-center justify-center gap-4 overflow-hidden text-text-primary">
      <div className="pointer-events-none absolute inset-0 opacity-40 radar-mesh" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_40px_-8px_color-mix(in_srgb,var(--color-primary)_50%,transparent)]">
        <ShieldHalf className="h-6 w-6 animate-pulse text-primary" />
        <span className="absolute inset-0 rounded-2xl border border-primary/30 animate-[radar-pulse_2.4s_ease-out_infinite]" />
      </div>
      <div className="relative text-center">
        <p className="font-display text-sm font-bold tracking-tight">
          SENTINEL<span className="text-primary">X</span>
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-text-muted">Loading intelligence console</p>
      </div>
    </div>
  );
}
