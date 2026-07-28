import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { createApp } from "./app.js";
import { env } from "./utils/env.js";
import { registerSocketGateway } from "./socket/socketGateway.js";

// Defense in depth: an `async` Express route handler that throws (or whose
// promise rejects) before hitting its own try/catch would otherwise crash
// this entire process — killing every live session, socket, and case in
// progress over a single bad request. Log it loudly instead of dying, so
// one bug in one endpoint can never take the whole platform down.
process.on("unhandledRejection", (reason) => {
  console.error("[fatal-guard] Unhandled promise rejection (server stayed up):", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[fatal-guard] Uncaught exception (server stayed up):", error);
});

const app = createApp();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(env.isOriginAllowed(origin) ? null : new Error("Not allowed by CORS"), true);
    },
    credentials: true,
  },
});

registerSocketGateway(io);

// Bind 0.0.0.0 so Render's proxy can reach the process (not only localhost).
httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`SentinelX backend listening on http://0.0.0.0:${env.port}`);
});
