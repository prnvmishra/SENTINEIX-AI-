import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { LiveCaseProvider } from "@/context/LiveCaseContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <LiveCaseProvider>{children}</LiveCaseProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
