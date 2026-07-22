import { createContext } from "react";
import type { AppSocket } from "@/services/socket";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export interface SocketContextValue {
  socket: AppSocket | null;
  status: ConnectionStatus;
}

export const SocketContext = createContext<SocketContextValue | undefined>(undefined);
