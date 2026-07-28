import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  noPadding?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, glow = false, noPadding = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass-panel panel-shine relative overflow-hidden rounded-2xl",
          !noPadding && "p-4",
          glow && "shadow-[0_0_40px_-16px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

GlassPanel.displayName = "GlassPanel";
