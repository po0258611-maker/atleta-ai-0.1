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
import { SERVER_CONFIG, validateProductionConfig } from "./server/config/env";
import { getFirestoreAdapter } from "./server/repositories/firestoreAdapter";

function applySecurityHeaders(app: express.Express) {
  const isProduction = SERVER_CONFIG.NODE_ENV === "production";
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", isProduction ? "default-src 'self'; base-uri 'self'; frame-ancestors 'self' https:; object-src 'none'; img-src 'self' data: https: blob:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: wss:; font-src 'self' data: https:" : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http: ws: wss:; base-uri 'self'; frame-ancestors 'self' https: http:; object-src 'none'");
    if (isProduction && (req.secure || req.headers["x-forwarded-proto"] === "https")) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });
}

function isTrustedAiStudioOrigin(originStr: string): boolean {
  try {
    const url = new URL(originStr);
    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".run.app") ||
      host === "ai.studio" ||
      host.endsWith(".ai.studio") ||
      host === "aistudio.google.com" ||
      host.endsWith(".aistudio.google.com") ||
      host === "googleusercontent.com" ||
      host.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

function applyCors(app: express.Express) {
  const allowedOrigins = new Set(SERVER_CONFIG.CORS_ORIGINS);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next();
    const host = req.headers.host;
    const isSameOrigin = Boolean(host && (origin === `http://${host}` || origin === `https://${host}`));
    const isAllowed = allowedOrigins.has("*") || allowedOrigins.has(origin) || isSameOrigin || isTrustedAiStudioOrigin(origin);
    if (!isAllowed) return res.status(403).json({ error: { code: "CORS_ORIGIN_DENIED", message: "Origem não autorizada." } });
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Idempotency-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  });
}

async function checkReadiness() {
  try {
    await getFirestoreAdapter().collection("_health").limit(1).get();
    return true;
  } catch (error) {
    logger.warn("Readiness check: Firestore indisponível.", { error });
    return false;
  }
}

async function startServer() {
  validateProductionConfig();
  const app = express();
  const PORT = SERVER_CONFIG.PORT;
  const isProduction = SERVER_CONFIG.NODE_ENV === "production";
  if (SERVER_CONFIG.TRUST_PROXY) app.set("trust proxy", 1);
  applySecurityHeaders(app);
  applyCors(app);
  app.use(express.json({ limit: "1mb", strict: true, verify: (req: any, _res, buf) => { req.rawBody = buf.toString("utf8"); } }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok", version: "2.1.0", environment: SERVER_CONFIG.NODE_ENV, timestamp: new Date().toISOString() }));
  app.get("/api/ready", async (_req, res) => {
    const database = await checkReadiness();
    const buildArtifactReady = !isProduction || fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
    const ready = database && buildArtifactReady;
    if (!ready) return res.status(503).json({ status: "not_ready", checks: { database, buildArtifacts: buildArtifactReady }, timestamp: new Date().toISOString() });
    return res.status(200).json({ status: "ready", version: "2.1.0", checks: { database, buildArtifacts: buildArtifactReady }, timestamp: new Date().toISOString() });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/entitlements", entitlementRouter);
  app.use("/api/subscriptions", subscriptionRouter);
  app.use("/api/billing", subscriptionRouter);
  app.use("/api/database", databaseRouter);
  app.use("/api", aiRouter);
  app.use(errorHandler);
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      logger.error(`Artefato de produção ausente: ${indexPath}`);
      throw new Error(`Artefato de produção não encontrado em ${indexPath}. Execute 'npm run build' primeiro.`);
    }
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(indexPath));
  }
  app.listen(PORT, "0.0.0.0", () => logger.info(`ATLETA AI Server running on port ${PORT}`));
}
startServer().catch((error) => { logger.error("Falha fatal ao iniciar o servidor", { error }); process.exit(1); });
