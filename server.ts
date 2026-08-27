import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { authRouter } from "./server/routes/authRoutes";
import { aiRouter } from "./server/routes/aiRoutes";
import { entitlementRouter } from "./server/routes/entitlementRoutes";
import { subscriptionRouter } from "./server/routes/subscriptionRoutes";
import { databaseRouter } from "./server/routes/databaseRoutes";
import { errorHandler } from "./server/middlewares/errorHandler";
import { logger } from "./server/middlewares/logger";
import { SERVER_CONFIG } from "./server/config/env";

async function startServer() {
  const app = express();
  const PORT = SERVER_CONFIG.PORT;

  // JSON Body Parser with safe payload limit
  app.use(express.json({ limit: '1mb' }));

  // Basic Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "2.1.0",
      environment: SERVER_CONFIG.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // Core API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/entitlements", entitlementRouter);
  app.use("/api/subscriptions", subscriptionRouter);
  app.use("/api/database", databaseRouter);
  app.use("/api", aiRouter);

  // Error handling middleware for API
  app.use(errorHandler);

  // Vite middleware for development / Static files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`ATLETA AI Server running on port ${PORT}`);
  });
}

startServer();
