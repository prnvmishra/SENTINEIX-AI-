import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import { cn } from "@/utils/cn";

interface BackToHomeProps {
  className?: string;
}

export function BackToHome({ className }: BackToHomeProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.landing)}
      className={cn(
        "group inline-flex items-center gap-2 rounded-xl border border-border-strong/80 bg-surface/60 px-3 py-2 text-xs font-medium text-text-secondary backdrop-blur-md transition-all duration-300",
        "hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
      Back to Home
    </button>
  );
}
