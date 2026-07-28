import { ShieldHalf } from "lucide-react";
import { cn } from "@/utils/cn";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const markSize = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-11 w-11",
};

const iconSize = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function Logo({ className, showWordmark = true, size = "md" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-primary/35 bg-gradient-to-br from-primary/20 to-primary/5 shadow-[inset_0_1px_0_color-mix(in_srgb,white_12%,transparent)]",
          markSize[size],
        )}
      >
        <ShieldHalf className={cn("text-primary", iconSize[size])} />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-extrabold tracking-tight text-text-primary", size === "lg" ? "text-lg" : "text-sm")}>
            SENTINEL<span className="text-primary">X</span>
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-text-muted">AI · NFIP</span>
        </div>
      )}
    </div>
  );
}
