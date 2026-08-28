import "dotenv/config";
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
  const isProduction = SERVER_CONFIG.NODE_ENV === "production";

  app.disable("x-powered-by");

  // JSON Body Parser with safe payload limit
  app.use(express.json({ limit: "1mb" }));

  // Security headers. HTTPS/HSTS is enabled only in production.
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", isProduction
      ? "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; font-src 'self' data:"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http: ws: wss:; base-uri 'self'; frame-ancestors 'self'; object-src 'none'");

    if (isProduction && req.secure) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "2.1.0",
      environment: SERVER_CONFIG.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/entitlements", entitlementRouter);
  app.use("/api/subscriptions", subscriptionRouter);
  app.use("/api/database", databaseRouter);
  app.use("/api", aiRouter);

  app.use(errorHandler);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`ATLETA AI Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error("Falha fatal ao iniciar o servidor", { error });
  process.exit(1);
});
