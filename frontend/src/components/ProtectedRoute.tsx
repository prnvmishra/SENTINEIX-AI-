import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/app/routes";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg text-text-primary">
        <ShieldCheck className="h-6 w-6 animate-pulse text-primary" />
        <p className="text-xs text-text-muted">Verifying secure session...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return children;
}
