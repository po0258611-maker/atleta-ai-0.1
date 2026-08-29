import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { authRouter } from "./server/routes/authRoutes";
import { aiRouter } from "./server/routes/aiRoutes";
import { entitlementRouter } from "./server/routes/entitlementRoutes";
import { subscriptionRouter } from "./server/routes/subscriptionRoutes";
import { databaseRouter } from "./server/routes/databaseRoutes";
import { errorHandler } from "./server/middlewares/errorHandler";
import { logger } from "./server/middlewares/logger";
import { SERVER_CONFIG } from "./server/config/env";
import { getAdminFirestore } from "./server/services/firebaseAdmin";

function applySecurityHeaders(app: express.Express) {
  const isProduction = SERVER_CONFIG.NODE_ENV === "production";
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader(
      "Content-Security-Policy",
      isProduction
        ? "default-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; font-src 'self' data: https:"
        : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http: ws: wss:; base-uri 'self'; frame-ancestors 'self'; object-src 'none'"
    );
    if (isProduction && (_req.secure || _req.headers["x-forwarded-proto"] === "https")) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
}

function applyCors(app: express.Express) {
  const allowedOrigins = new Set(SERVER_CONFIG.CORS_ORIGINS);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next();
    const host = req.headers.host;
    const isSameOrigin = Boolean(host && (origin === `http://${host}` || origin === `https://${host}`));
    const isAllowed = allowedOrigins.has(origin) || isSameOrigin;
    if (!isAllowed) {
      return res.status(403).json({ error: { code: "CORS_ORIGIN_DENIED", message: "Origem não autorizada." } });
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Idempotency-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  });
}

async function checkFirestore(): Promise<{ connected: boolean; message?: string }> {
  try {
    await getAdminFirestore().collection("_health").doc("readiness").get();
    return { connected: true };
  } catch (error) {
    return { connected: false, message: error instanceof Error ? error.message : "Firestore indisponível" };
  }
}

async function startServer() {
  const app = express();
  const PORT = SERVER_CONFIG.PORT;
  const isProduction = SERVER_CONFIG.NODE_ENV === "production";
  const requireDatabaseReadiness = process.env.REQUIRE_DATABASE_READINESS === "true";
  if (SERVER_CONFIG.TRUST_PROXY) app.set("trust proxy", 1);

  applySecurityHeaders(app);
  applyCors(app);
  app.use(express.json({ limit: "1mb", strict: true, verify: (req: any, _res, buf) => { req.rawBody = buf.toString("utf8"); } }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  // Liveness must never depend on external services. This is the endpoint
  // that cloud preview/container platforms can use to verify the process.
  app.get("/api/health", (_req, res) => res.status(200).json({
    status: "ok",
    version: SERVER_CONFIG.APP_VERSION,
    environment: SERVER_CONFIG.NODE_ENV,
    timestamp: new Date().toISOString(),
  }));

  // Readiness is deliberately opt-in for external database checks. The UI
  // preview must remain available when Firebase ADC is not configured.
  app.get("/api/ready", async (_req, res) => {
    const buildArtifactReady = !isProduction || fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
    let databaseReady = true;
    let databaseError: string | undefined;

    if (requireDatabaseReadiness) {
      const firestore = await checkFirestore();
      databaseReady = firestore.connected;
      databaseError = firestore.message;
    }

    const ready = buildArtifactReady && databaseReady;
    return res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      version: SERVER_CONFIG.APP_VERSION,
      checks: { database: databaseReady, buildArtifacts: buildArtifactReady },
      errors: databaseError ? { database: databaseError } : undefined,
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
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true, host: "0.0.0.0" }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) throw new Error(`Artefato de produção não encontrado em ${indexPath}. Execute 'npm run build' primeiro.`);
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(indexPath));
  }

  app.listen(PORT, "0.0.0.0", () => logger.info(`ATLETA AI Server running on port ${PORT}`));
}

startServer().catch((error) => {
  logger.error("Falha fatal ao iniciar o servidor", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
