import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { openAPI } from "better-auth/plugins";
import { evaluateBetaLoginAccess } from "./beta-access.js";
import { db, ensureDatabaseSchema } from "./db.js";
import { env } from "./env.js";

await ensureDatabaseSchema();

function getLoginProvider(context: unknown): string | null {
  const ctx = context as {
    path?: string;
    params?: Record<string, string | undefined>;
    body?: { provider?: string };
    request?: { url?: string };
  } | null;

  if (!ctx) return null;
  if (ctx.body?.provider) return ctx.body.provider;
  if (ctx.params?.id) return ctx.params.id;
  if (ctx.path === "/callback/google" || ctx.path === "/callback/:id" && ctx.params?.id === "google") return "google";
  if (ctx.request?.url) {
    try {
      const pathname = new URL(ctx.request.url).pathname;
      if (pathname.endsWith("/callback/google")) return "google";
    } catch {
      return null;
    }
  }
  return null;
}

export const auth = betterAuth({
  appName: "Auth Service",
  baseURL: env.betterAuthUrl,
  basePath: "/api/auth",
  secret: env.betterAuthSecret,
  database: db,
  trustedOrigins: env.trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    env.googleClientId && env.googleClientSecret
      ? {
          google: {
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          },
        }
      : undefined,
  session: {
    storeSessionInDatabase: true,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
  },
  databaseHooks: {
    session: {
      create: {
        async before(session, context) {
          const adapter = context?.context.internalAdapter;
          if (!adapter) {
            throw APIError.from("FORBIDDEN", {
              code: "BETA_ACCESS_REQUIRED",
              message: "Beta access is required to sign in.",
            });
          }

          const user = await adapter.findUserById(session.userId);
          const decision = user
            ? await evaluateBetaLoginAccess(user, getLoginProvider(context), {
                updateUserRole: (userId, role) => adapter.updateUser(userId, { role }),
              })
            : { allowed: false, reason: "missing_email" as const };

          if (!decision.allowed) {
            throw APIError.from("FORBIDDEN", {
              code: "BETA_ACCESS_REQUIRED",
              message: "Beta access is required to sign in.",
            });
          }
        },
      },
    },
  },
  advanced: {
    useSecureCookies: env.isProduction,
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
    },
  },
  plugins: [
    organization(),
    admin(),
    openAPI(),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
