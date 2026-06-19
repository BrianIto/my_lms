import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { openAPI } from "better-auth/plugins";
import { db } from "./db.js";
import { env } from "./env.js";

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
