import { createAuthClient } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { env } from "./env.js";

export const authClient = createAuthClient({
  baseURL: env.betterAuthUrl,
  plugins: [
    organizationClient(),
    adminClient(),
  ],
});
