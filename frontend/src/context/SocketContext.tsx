import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createSocket } from "@/services/socket";
import type { AppSocket } from "@/services/socket";
import { SocketContext } from "@/context/socketContextInstance";
import type { ConnectionStatus } from "@/context/socketContextInstance";

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, status: authStatus } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const socketRef = useRef<AppSocket | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated" || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus("idle");
      return;
    }

    const socket = createSocket(token);
    socketRef.current = socket;
    setStatus("connecting");

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authStatus, token]);

  const value = useMemo(() => ({ socket: socketRef.current, status }), [status]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
