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
          "glass-panel relative rounded-xl",
          !noPadding && "p-4",
          glow && "shadow-[0_0_24px_-8px_var(--color-primary)]",
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
