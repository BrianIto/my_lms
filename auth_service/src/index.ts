import { randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import {
  createBetaAccessRequest,
  decideBetaAccessRequest,
  ensureBetaAccessTable,
  getBetaAccess,
  listBetaAllowlist,
  preflightEmailFirstSignin,
  upsertBetaAccess,
} from "./beta-access.js";
import { closeDb } from "./db.js";
import { assertRuntimeEnv, env } from "./env.js";

assertRuntimeEnv();
await ensureBetaAccessTable();

type LogLevel = "info" | "warn" | "error";

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause instanceof Error
        ? {
            name: error.cause.name,
            message: error.cause.message,
            stack: error.cause.stack,
          }
        : error.cause,
    };
  }

  return { message: String(error) };
}

function log(level: LogLevel, message: string, metadata: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    message,
    service: "auth-service",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    ...metadata,
  });

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

function getRequestMetadata(c: { req: { method: string; path: string; header: (name: string) => string | undefined } }) {
  return {
    method: c.req.method,
    path: c.req.path,
    requestId: c.req.header("x-request-id") ?? randomUUID(),
    origin: c.req.header("origin"),
    userAgent: c.req.header("user-agent"),
    forwardedFor: c.req.header("x-forwarded-for"),
  };
}

const app = new Hono();

app.use("*", async (c, next) => {
  const startedAt = performance.now();
  const request = getRequestMetadata(c);
  c.header("x-request-id", String(request.requestId));

  try {
    await next();
    const durationMs = Math.round(performance.now() - startedAt);
    const level = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";
    log(level, "request completed", {
      ...request,
      status: c.res.status,
      durationMs,
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    log("error", "request failed", {
      ...request,
      durationMs,
      error: serializeError(error),
    });
    throw error;
  }
});

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return env.betterAuthUrl;
      return env.trustedOrigins.includes(origin) ? origin : null;
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.get("/", (c) => c.json({ name: "auth-service", status: "ok" }));

// Explicit health check requested for service verification. Better Auth is mounted below.
app.get("/api/auth/ok", (c) => c.json({ status: "ok" }));
app.get("/api/beta/access", getBetaAccess);
app.post("/api/beta/email-first-signin", preflightEmailFirstSignin);
app.get("/api/beta/allowlist", listBetaAllowlist);
app.post("/api/beta/allowlist", upsertBetaAccess);
app.post("/api/beta/requests", createBetaAccessRequest);
app.get("/api/beta/requests/:decision/:token", decideBetaAccessRequest);

app.all("/api/auth/*", async (c) => {
  try {
    return await auth.handler(c.req.raw);
  } catch (error) {
    log("error", "better-auth handler failed", {
      ...getRequestMetadata(c),
      error: serializeError(error),
    });
    throw error;
  }
});

app.onError((error, c) => {
  log("error", "unhandled route error", {
    ...getRequestMetadata(c),
    error: serializeError(error),
  });
  return c.json({ error: "internal server error" }, 500);
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.port,
  },
  (info) => {
    log("info", "auth service listening", { port: info.port });
    log("info", "better auth mounted", { url: `${env.betterAuthUrl}/api/auth` });
  },
);

const shutdown = async (signal: NodeJS.Signals) => {
  log("info", "shutdown signal received", { signal });
  server.close();
  await closeDb();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (reason) => {
  log("error", "unhandled promise rejection", { error: serializeError(reason) });
});
process.on("uncaughtException", (error) => {
  log("error", "uncaught exception", { error: serializeError(error) });
  process.exit(1);
});
