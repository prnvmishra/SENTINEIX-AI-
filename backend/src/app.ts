import express from "express";
import cors from "cors";
import { env } from "./utils/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { caseRouter } from "./routes/case.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { geoRouter } from "./routes/geo.routes.js";
import { intelRouter } from "./routes/intel.routes.js";
import { analysisRouter } from "./routes/analysis.routes.js";
import { isFirebaseConfigured } from "./services/firebaseAuthService.js";
import { isAiAnalystEnabled } from "./services/ai/openRouterClient.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(env.isOriginAllowed(origin) ? null : new Error("Not allowed by CORS"), true);
      },
      credentials: true,
    }),
  );
  // Raised from Express's 100kb default so a base64-encoded recorded-call
  // upload (see /api/analysis/recording) fits in a single JSON request.
  app.use(express.json({ limit: "30mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "sentinelx-backend",
      timestamp: new Date().toISOString(),
      firebaseEnabled: isFirebaseConfigured(),
      aiAnalystEnabled: isAiAnalystEnabled(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/cases", caseRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/geo", geoRouter);
  app.use("/api/intel", intelRouter);
  app.use("/api/analysis", analysisRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
