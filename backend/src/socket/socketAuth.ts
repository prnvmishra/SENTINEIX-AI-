import type { Socket } from "socket.io";
import type { AuthUser } from "@shared/types";
import { resolveUser } from "../services/authService.js";

export interface SocketData {
  user: AuthUser;
}

type NextFn = (err?: Error) => void;

export async function socketAuthMiddleware(socket: Socket, next: NextFn): Promise<void> {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    next(new Error("Missing session token"));
    return;
  }

  try {
    const user = await resolveUser(token);
    (socket.data as SocketData).user = user;
    next();
  } catch {
    next(new Error("Invalid or expired session token"));
  }
}
