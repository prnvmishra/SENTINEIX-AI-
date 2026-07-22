import { ShieldHalf } from "lucide-react";
import { cn } from "@/utils/cn";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
        <ShieldHalf className="h-4 w-4 text-primary" />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-wide text-text-primary">
            SENTINEL<span className="text-primary">X</span>
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-text-muted">AI · NFIP</span>
        </div>
      )}
    </div>
  );
}
