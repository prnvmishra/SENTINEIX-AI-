import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { env } from "@/services/env";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(token: string): AppSocket {
  return io(env.socketUrl, {
    autoConnect: false,
    auth: { token },
    reconnectionAttempts: 5,
  });
}
