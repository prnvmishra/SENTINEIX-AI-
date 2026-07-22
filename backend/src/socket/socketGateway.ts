import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types";
import { socketAuthMiddleware } from "./socketAuth.js";
import type { SocketData } from "./socketAuth.js";
import {
  getBufferedEvents,
  isSimulationRunning,
  pauseSimulation,
  resumeSimulation,
  startSimulation,
  stopSimulation,
} from "../services/simulationEngine.js";

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

let sharedIo: TypedServer | null = null;

export function registerSocketGateway(io: TypedServer): void {
  sharedIo = io;
  io.use(socketAuthMiddleware);

  io.on("connection", (socket: TypedSocket) => {
    const { user } = socket.data as SocketData;
    console.log(`[socket] ${user.name} (${user.role}) connected — ${socket.id}`);

    replayBufferedEventsTo(socket);

    socket.on("simulation:start", ({ scenarioId }) => startSimulation(scenarioId));
    socket.on("simulation:stop", () => stopSimulation());
    socket.on("simulation:pause", () => pauseSimulation());
    socket.on("simulation:resume", () => resumeSimulation());

    socket.on("disconnect", (reason) => {
      console.log(`[socket] ${user.name} disconnected (${reason}) — ${socket.id}`);
    });
  });
}

type UntypedEmitter = { emit: (event: string, payload: unknown) => void };

function replayBufferedEventsTo(socket: TypedSocket): void {
  if (!isSimulationRunning()) return;

  for (const { event, payload } of getBufferedEvents()) {
    (socket as unknown as UntypedEmitter).emit(event, payload);
  }
}

export function getIo(): TypedServer {
  if (!sharedIo) {
    throw new Error("Socket.IO server has not been initialized yet");
  }
  return sharedIo;
}
