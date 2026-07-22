import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { createApp } from "./app.js";
import { env } from "./utils/env.js";
import { registerSocketGateway } from "./socket/socketGateway.js";

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

httpServer.listen(env.port, () => {
  console.log(`SentinelX backend listening on http://localhost:${env.port}`);
});
