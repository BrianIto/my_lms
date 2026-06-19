import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth.js";
import {
  createBetaAccessRequest,
  decideBetaAccessRequest,
  ensureBetaAccessTable,
  getBetaAccess,
  upsertBetaAccess,
} from "./beta-access.js";
import { closeDb } from "./db.js";
import { assertRuntimeEnv, env } from "./env.js";

assertRuntimeEnv();
await ensureBetaAccessTable();

const app = new Hono();

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
app.post("/api/beta/allowlist", upsertBetaAccess);
app.post("/api/beta/requests", createBetaAccessRequest);
app.get("/api/beta/requests/:decision/:token", decideBetaAccessRequest);

app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

const server = serve(
  {
    fetch: app.fetch,
    port: env.port,
  },
  (info) => {
    console.log(`Auth service listening on http://localhost:${info.port}`);
    console.log(`Better Auth mounted at ${env.betterAuthUrl}/api/auth`);
  },
);

const shutdown = async (signal: NodeJS.Signals) => {
  console.log(`${signal} received, shutting down...`);
  server.close();
  await closeDb();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
