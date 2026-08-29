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

function applySecurityHeaders(app: express.Express) {
  const isProduction = SERVER_CONFIG.NODE_ENV === "production";

  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader(
      "Content-Security-Policy",
      isProduction
        ? "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https:; font-src 'self' data:"
        : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http: ws: wss:; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
    );

    if (isProduction && (req.secure || req.headers["x-forwarded-proto"] === "https")) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
  });
}

function applyCors(app: express.Express) {
  const allowedOrigins = new Set(SERVER_CONFIG.CORS_ORIGINS);

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (!origin) {
      return next();
    }

    // An explicit allow-list is required for cross-origin browser requests.
    if (!allowedOrigins.has(origin)) {
      if (req.method === "OPTIONS") {
        return res.status(403).json({
          error: { code: "CORS_ORIGIN_DENIED", message: "Origem não autorizada." },
        });
      }
      return next();
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Idempotency-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    return next();
  });
}

async function startServer() {
  const app = express();
  const PORT = SERVER_CONFIG.PORT;
  const isProduction = SERVER_CONFIG.NODE_ENV === "production";

  // Set TRUST_PROXY=true only when the deployment is actually behind a trusted
  // reverse proxy/load balancer. Never trust arbitrary client-supplied X-Forwarded-* headers.
  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }

  applySecurityHeaders(app);
  applyCors(app);

  // JSON parser with strict payload limit and rawBody capture for webhook verification
  app.use(
    express.json({
      limit: "1mb",
      strict: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString("utf8");
      },
    })
  );
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  // Liveness: only answers whether the Node process is alive.
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
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
    app.use(express.static(distPath, { index: false }));
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
