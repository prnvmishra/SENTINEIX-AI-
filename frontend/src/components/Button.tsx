import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-bg hover:bg-primary-glow shadow-[0_8px_28px_-10px_color-mix(in_srgb,var(--color-primary)_70%,transparent)] disabled:hover:bg-primary",
  secondary:
    "bg-surface-raised/90 text-text-primary border border-border-strong hover:border-primary/50 hover:bg-surface-raised",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-raised/80 hover:text-text-primary",
  danger: "bg-danger text-white hover:bg-danger/90 shadow-[0_8px_24px_-12px_color-mix(in_srgb,var(--color-danger)_80%,transparent)]",
  outline:
    "bg-transparent border border-border-strong text-primary hover:border-primary/70 hover:bg-primary/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2 text-sm gap-2 rounded-xl",
  lg: "px-6 py-3 text-base gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
