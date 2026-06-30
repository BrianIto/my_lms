import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Context } from "hono";
import { Resend } from "resend";
import { db } from "./db.js";
import { env } from "./env.js";

export type BetaStatus = "invited" | "active" | "revoked";
export type BetaAccessEntry = {
  id: string;
  email: string;
  user_id: string | null;
  status: BetaStatus;
  created_at: Date;
  updated_at: Date;
};
type BetaRequestStatus = "pending" | "approved" | "declined";
type BetaDecision = "approve" | "decline";
type Query = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
type BetaRequestInput = {
  email?: string;
  preferredName?: string;
  whatsappContact?: string;
  whatsappConsent?: boolean;
};
type BetaRequestSubmission = {
  email: string;
  status: "pending";
  notification: "sent" | "failed" | "already_sent";
};
type BetaRequestDeps = {
  query?: Query;
  sendNotification?: (request: BetaRequestRow, approveToken: string, declineToken: string) => Promise<{ id: string }>;
  randomId?: () => string;
  randomToken?: () => string;
  onNotificationError?: (error: unknown) => void;
};

type LoginGateUser = {
  id: string;
  email?: string | null;
  role?: string | null;
};

type LoginGateDeps = {
  query?: Query;
  updateUserRole?: (userId: string, role: "admin") => Promise<unknown>;
};

type EmailCredentialState = "has_password" | "needs_password_setup";

export type EmailFirstSigninPreflight = {
  email: string;
  credential_state: EmailCredentialState;
};

export type BetaLoginDecision = {
  allowed: boolean;
  reason: "active_beta" | "admin" | "google_bootstrap_admin" | "missing_email" | "inactive_beta";
  email?: string;
};

type BetaRequestRow = {
  id: string;
  email: string;
  preferred_name: string | null;
  whatsapp_contact: string | null;
  whatsapp_consent: boolean;
  status: BetaRequestStatus;
  approve_token_hash: string | null;
  decline_token_hash: string | null;
  notification_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export const GOOGLE_BOOTSTRAP_ADMIN_EMAIL = "brian.oliveira100@gmail.com";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const BETA_STATUSES = ["invited", "active", "revoked"] as const;
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export async function ensureBetaAccessTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS beta_access (
      id bigserial PRIMARY KEY,
      email text NOT NULL UNIQUE,
      user_id text,
      status text NOT NULL DEFAULT 'invited',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS beta_access_requests (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      preferred_name text,
      whatsapp_contact text,
      whatsapp_consent boolean NOT NULL DEFAULT false,
      status text NOT NULL DEFAULT 'pending',
      approve_token_hash text UNIQUE,
      decline_token_hash text UNIQUE,
      notification_sent_at timestamptz,
      resend_email_id text,
      decided_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT beta_access_requests_status_check CHECK (status IN ('pending', 'approved', 'declined')),
      CONSTRAINT beta_access_requests_email_lower_check CHECK (email = lower(email))
    )
  `);

  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS preferred_name text`);
  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS whatsapp_contact text`);
  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS whatsapp_consent boolean NOT NULL DEFAULT false`);
  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS approve_token_hash text UNIQUE`);
  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS decline_token_hash text UNIQUE`);
  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz`);
  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS resend_email_id text`);
  await db.query(`ALTER TABLE beta_access_requests ADD COLUMN IF NOT EXISTS decided_at timestamptz`);
  await db.query(`ALTER TABLE beta_access_requests DROP CONSTRAINT IF EXISTS beta_access_requests_status_check`);
  await db.query(`UPDATE beta_access_requests SET status = 'pending' WHERE status = 'requested'`);
  await db.query(`
    ALTER TABLE beta_access_requests
    ADD CONSTRAINT beta_access_requests_status_check CHECK (status IN ('pending', 'approved', 'declined'))
  `);
}

export async function getBetaAccessStatus(email: string, query: Query = db.query.bind(db)): Promise<BetaStatus | null> {
  const normalizedEmail = normalizeEmail(email);
  const result = await query<{ status: BetaStatus }>(
    "SELECT status FROM beta_access WHERE email = $1 LIMIT 1",
    [normalizedEmail],
  );
  return result.rows[0]?.status ?? null;
}

export async function getEmailFirstSigninPreflight(
  input: { email?: string } | null,
  query: Query = db.query.bind(db),
): Promise<EmailFirstSigninPreflight> {
  const email = normalizeEmail(input?.email ?? "");
  if (!email || !isValidEmail(email)) {
    throw new Error("invalid email");
  }

  const status = await getBetaAccessStatus(email, query);
  if (status !== "active") {
    throw new Error("beta access required");
  }

  const result = await query<{ has_password: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM "user" u
       JOIN account a ON a."userId" = u.id
       WHERE u.email = $1
         AND a."providerId" = 'credential'
         AND a.password IS NOT NULL
       LIMIT 1
     ) AS has_password`,
    [email],
  );

  return {
    email,
    credential_state: result.rows[0]?.has_password ? "has_password" : "needs_password_setup",
  };
}

export async function upsertBetaAccessForUser(
  email: string,
  status: BetaStatus,
  userId?: string | null,
  query: Query = db.query.bind(db),
) {
  const normalizedEmail = normalizeEmail(email);
  await query(
    `INSERT INTO beta_access (email, user_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET
       user_id = COALESCE(EXCLUDED.user_id, beta_access.user_id),
       status = EXCLUDED.status,
       updated_at = now()`,
    [normalizedEmail, userId ?? null, status],
  );
}

export function isGoogleBootstrapAdminEmail(email: string | null | undefined) {
  return typeof email === "string" && normalizeEmail(email) === GOOGLE_BOOTSTRAP_ADMIN_EMAIL;
}

export function isAdminRole(role: string | null | undefined) {
  return typeof role === "string" && role.split(",").map((value) => value.trim().toLowerCase()).includes("admin");
}

export function isBetaStatus(status: unknown): status is BetaStatus {
  return typeof status === "string" && BETA_STATUSES.includes(status as BetaStatus);
}

export function hasAdminSession(session: unknown) {
  const user = (session as { user?: { role?: string | null } } | null)?.user;
  return isAdminRole(user?.role);
}

type AllowlistSessionResolver = (headers: Headers) => Promise<unknown>;

type BetaAllowlistAdminDeps = {
  getSession?: AllowlistSessionResolver;
  getFallbackSession?: AllowlistSessionResolver;
};

export async function getDirectBetterAuthSession(headers: Headers) {
  const { auth } = await import("./auth.js");
  return auth.api.getSession({ headers });
}

export async function getBetterAuthHandlerSession(headers: Headers) {
  const cookie = headers.get("cookie");
  if (!cookie) return null;

  const { auth } = await import("./auth.js");
  const sessionRequestHeaders = new Headers();
  sessionRequestHeaders.set("cookie", cookie);

  const userAgent = headers.get("user-agent");
  if (userAgent) sessionRequestHeaders.set("user-agent", userAgent);
  for (const headerName of ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]) {
    const value = headers.get(headerName);
    if (value) sessionRequestHeaders.set(headerName, value);
  }

  const response = await auth.handler(
    new Request(`${env.betterAuthUrl.replace(/\/$/, "")}/api/auth/get-session`, {
      method: "GET",
      headers: sessionRequestHeaders,
    }),
  );

  if (!response.ok) return null;
  return response.json().catch(() => null);
}

export async function resolveBetaAllowlistAdmin(headers: Headers, deps: BetaAllowlistAdminDeps = {}): Promise<
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string }
> {
  const getSession = deps.getSession ?? getDirectBetterAuthSession;
  const getFallbackSession = deps.getFallbackSession ?? getBetterAuthHandlerSession;
  let session: unknown = null;
  try {
    session = await getSession(headers);
  } catch {
    session = null;
  }
  session ??= await getFallbackSession(headers);

  if (!(session as { user?: unknown } | null)?.user) {
    return { ok: false as const, status: 401, error: "authentication required" };
  }
  if (!hasAdminSession(session)) {
    return { ok: false as const, status: 403, error: "admin access required" };
  }
  return { ok: true as const };
}

async function requireBetaAllowlistAdmin(c: Context) {
  const admin = await resolveBetaAllowlistAdmin(c.req.raw.headers);
  if (!admin.ok) {
    return { ok: false as const, response: c.json({ error: admin.error }, admin.status) };
  }
  return { ok: true as const };
}

export async function listBetaAccessEntries(query: Query = db.query.bind(db)) {
  const result = await query<BetaAccessEntry>(
    `SELECT id::text, email, user_id, status, created_at, updated_at
     FROM beta_access
     ORDER BY updated_at DESC, email ASC`,
  );
  return result.rows.map((row) => ({ ...row, email: normalizeEmail(row.email) }));
}

export async function upsertBetaAccessEntry(
  input: { email?: string; status?: unknown },
  query: Query = db.query.bind(db),
) {
  const email = normalizeEmail(input.email ?? "");
  if (!email || !isValidEmail(email)) {
    throw new Error("invalid email");
  }

  const status = input.status ?? "invited";
  if (!isBetaStatus(status)) {
    throw new Error("invalid status");
  }

  const result = await query<BetaAccessEntry>(
    `INSERT INTO beta_access (email, status)
     VALUES ($1, $2)
     ON CONFLICT (email)
     DO UPDATE SET status = EXCLUDED.status, updated_at = now()
     RETURNING id::text, email, user_id, status, created_at, updated_at`,
    [email, status],
  );

  const entry = result.rows[0];
  if (!entry) {
    throw new Error("could not save beta access entry");
  }
  return { ...entry, email: normalizeEmail(entry.email) };
}

export async function evaluateBetaLoginAccess(
  user: LoginGateUser,
  provider: string | null | undefined,
  deps: LoginGateDeps = {},
): Promise<BetaLoginDecision> {
  const query = deps.query ?? db.query.bind(db);
  const email = user.email ? normalizeEmail(user.email) : undefined;

  if (!email) {
    return { allowed: false, reason: "missing_email" };
  }

  if (provider === "google" && isGoogleBootstrapAdminEmail(email)) {
    await upsertBetaAccessForUser(email, "active", user.id, query);
    await deps.updateUserRole?.(user.id, "admin");
    return { allowed: true, reason: "google_bootstrap_admin", email };
  }

  if (isAdminRole(user.role)) {
    return { allowed: true, reason: "admin", email };
  }

  const status = await getBetaAccessStatus(email, query);
  if (status === "active") {
    await upsertBetaAccessForUser(email, "active", user.id, query);
    return { allowed: true, reason: "active_beta", email };
  }

  return { allowed: false, reason: "inactive_beta", email };
}

export async function getBetaAccess(c: Context) {
  const { auth } = await import("./auth.js");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.email) {
    return c.json({ authenticated: false, beta_access: false, status: "anonymous" }, 401);
  }

  const email = normalizeEmail(session.user.email);
  const status = (await getBetaAccessStatus(email)) ?? "invited";
  return c.json({
    authenticated: true,
    beta_access: status === "active",
    status,
    email,
  });
}

export async function preflightEmailFirstSignin(c: Context) {
  const body = await c.req.json<{ email?: string }>().catch(() => null);

  try {
    const preflight = await getEmailFirstSigninPreflight(body);
    return c.json(preflight);
  } catch (error) {
    if (error instanceof Error && error.message === "invalid email") {
      return c.json({ error: "invalid email" }, 400);
    }
    if (error instanceof Error && error.message === "beta access required") {
      return c.json({ error: "beta access required" }, 403);
    }
    throw error;
  }
}

export async function listBetaAllowlist(c: Context) {
  const admin = await requireBetaAllowlistAdmin(c);
  if (!admin.ok) return admin.response;

  const entries = await listBetaAccessEntries();
  return c.json({ entries });
}

export async function upsertBetaAccess(c: Context) {
  const admin = await requireBetaAllowlistAdmin(c);
  if (!admin.ok) return admin.response;

  const body = await c.req.json<{ email?: string; status?: BetaStatus }>().catch(() => null);
  try {
    const entry = await upsertBetaAccessEntry(body ?? {});
    return c.json(entry, 201);
  } catch (error) {
    if (error instanceof Error && ["invalid email", "invalid status"].includes(error.message)) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
}

export async function submitBetaAccessRequest(input: BetaRequestInput | null, deps: BetaRequestDeps = {}): Promise<BetaRequestSubmission> {
  const query = deps.query ?? db.query.bind(db);
  const sendNotification = deps.sendNotification ?? sendBetaRequestNotification;
  const randomId = deps.randomId ?? randomUUID;
  const randomToken = deps.randomToken ?? (() => randomBytes(32).toString("base64url"));

  const email = normalizeEmail(input?.email ?? "");
  if (!email || !isValidEmail(email)) {
    throw new Error("invalid email");
  }

  const preferredName = normalizeOptionalText(input?.preferredName);
  const whatsappConsent = input?.whatsappConsent === true;
  const whatsappContact = whatsappConsent ? normalizeOptionalText(input?.whatsappContact) : null;
  const approveToken = randomToken();
  const declineToken = randomToken();

  const result = await query<BetaRequestRow>(
    `INSERT INTO beta_access_requests (
       id, email, preferred_name, whatsapp_contact, whatsapp_consent, status, approve_token_hash, decline_token_hash
     )
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
     ON CONFLICT (email)
     DO UPDATE SET
       preferred_name = EXCLUDED.preferred_name,
       whatsapp_contact = EXCLUDED.whatsapp_contact,
       whatsapp_consent = EXCLUDED.whatsapp_consent,
       status = CASE WHEN beta_access_requests.status = 'pending' THEN beta_access_requests.status ELSE 'pending' END,
       approve_token_hash = CASE WHEN beta_access_requests.status = 'pending' AND beta_access_requests.notification_sent_at IS NOT NULL AND beta_access_requests.approve_token_hash IS NOT NULL THEN beta_access_requests.approve_token_hash ELSE EXCLUDED.approve_token_hash END,
       decline_token_hash = CASE WHEN beta_access_requests.status = 'pending' AND beta_access_requests.notification_sent_at IS NOT NULL AND beta_access_requests.decline_token_hash IS NOT NULL THEN beta_access_requests.decline_token_hash ELSE EXCLUDED.decline_token_hash END,
       notification_sent_at = CASE WHEN beta_access_requests.status = 'pending' THEN beta_access_requests.notification_sent_at ELSE NULL END,
       resend_email_id = CASE WHEN beta_access_requests.status = 'pending' THEN beta_access_requests.resend_email_id ELSE NULL END,
       decided_at = CASE WHEN beta_access_requests.status = 'pending' THEN beta_access_requests.decided_at ELSE NULL END,
       updated_at = now()
     RETURNING id, email, preferred_name, whatsapp_contact, whatsapp_consent, status, approve_token_hash, decline_token_hash, notification_sent_at, created_at, updated_at`,
    [randomId(), email, preferredName, whatsappContact, whatsappConsent, tokenHash(approveToken), tokenHash(declineToken)],
  );

  const request = result.rows[0];
  if (!request) {
    throw new Error("could not save beta request");
  }

  await query(
    `INSERT INTO beta_access (email, status)
     VALUES ($1, 'invited')
     ON CONFLICT (email) DO NOTHING`,
    [request.email],
  );

  if (request.notification_sent_at) {
    return { email: request.email, status: "pending", notification: "already_sent" };
  }

  try {
    const sent = await sendNotification(request, approveToken, declineToken);
    await query(
      "UPDATE beta_access_requests SET notification_sent_at = now(), resend_email_id = $2, updated_at = now() WHERE id = $1",
      [request.id, sent.id],
    );
    return { email: request.email, status: "pending", notification: "sent" };
  } catch (error) {
    deps.onNotificationError?.(error);
    return { email: request.email, status: "pending", notification: "failed" };
  }
}

export async function createBetaAccessRequest(c: Context) {
  const body = await c.req.json<BetaRequestInput>().catch(() => null);

  try {
    const submission = await submitBetaAccessRequest(body, {
      onNotificationError: (error) => console.error("Beta request notification failed after persistence", error),
    });

    return c.json(
      {
        email: submission.email,
        status: submission.status,
        notification: submission.notification,
        message:
          submission.notification === "failed"
            ? "Request saved — admin notification is temporarily unavailable, but your pending request is recorded."
            : "Request sent — we’ll notify you by email or WhatsApp.",
      },
      202,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "invalid email") {
      return c.json({ error: "invalid email" }, 400);
    }
    throw error;
  }
}

export async function decideBetaAccessRequestWithQuery(decision: BetaDecision, token: string, query: Query = db.query.bind(db)) {
  const tokenColumn = decision === "approve" ? "approve_token_hash" : "decline_token_hash";
  const result = await query<BetaRequestRow>(
    `UPDATE beta_access_requests
     SET status = $1, approve_token_hash = NULL, decline_token_hash = NULL, decided_at = now(), updated_at = now()
     WHERE ${tokenColumn} = $2 AND status = 'pending'
     RETURNING id, email, preferred_name, whatsapp_contact, whatsapp_consent, status, approve_token_hash, decline_token_hash, notification_sent_at, created_at, updated_at`,
    [decision === "approve" ? "approved" : "declined", tokenHash(token)],
  );

  const request = result.rows[0];
  if (!request) return null;

  if (decision === "approve") {
    await query(
      `INSERT INTO beta_access (email, status)
       VALUES ($1, 'active')
       ON CONFLICT (email)
       DO UPDATE SET status = 'active', updated_at = now()`,
      [request.email],
    );
  }

  return request;
}

export async function decideBetaAccessRequest(c: Context) {
  const decision = c.req.param("decision") as BetaDecision;
  const token = c.req.param("token");
  if (!["approve", "decline"].includes(decision) || !token) {
    return c.json({ error: "invalid approval link" }, 400);
  }

  const request = await decideBetaAccessRequestWithQuery(decision, token);
  if (!request) {
    return c.html(renderDecisionPage("Invalid or expired link", "This beta request link has already been used or does not exist."), 400);
  }

  return c.html(
    renderDecisionPage(
      decision === "approve" ? "Beta request approved" : "Beta request declined",
      decision === "approve"
        ? `${request.email} is now active in beta_access and can use the Better Auth beta sign-in/access flow.`
        : `${request.email} was declined and was not granted beta access.`,
    ),
  );
}

async function sendBetaRequestNotification(request: BetaRequestRow, approveToken: string, declineToken: string) {
  if (!env.resendApiKey || !env.betaRequestFrom || !env.betaRequestAdminEmail || !env.betaRequestApprovalBaseUrl) {
    throw new Error("Missing Resend beta request environment configuration");
  }

  const resend = new Resend(env.resendApiKey);
  const baseUrl = env.betaRequestApprovalBaseUrl.replace(/\/$/, "");
  const approveUrl = `${baseUrl}/api/beta/requests/approve/${approveToken}`;
  const declineUrl = `${baseUrl}/api/beta/requests/decline/${declineToken}`;
  const nameLine = request.preferred_name ? `<p><strong>Name:</strong> ${escapeHtml(request.preferred_name)}</p>` : "";
  const whatsappLine = request.whatsapp_consent
    ? `<p><strong>WhatsApp consent:</strong> yes${request.whatsapp_contact ? ` — ${escapeHtml(request.whatsapp_contact)}` : ""}</p>`
    : "<p><strong>WhatsApp consent:</strong> no</p>";

  const { data, error } = await resend.emails.send(
    {
      from: env.betaRequestFrom,
      to: [env.betaRequestAdminEmail],
      subject: `Beta request: ${request.email}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
          <h1>New Agentic Engineering beta request</h1>
          <p><strong>Email:</strong> ${escapeHtml(request.email)}</p>
          ${nameLine}
          ${whatsappLine}
          <p>
            <a href="${approveUrl}" style="display:inline-block;margin-right:12px;padding:10px 14px;background:#111;color:#fff;text-decoration:none;border-radius:999px">Approve</a>
            <a href="${declineUrl}" style="display:inline-block;padding:10px 14px;background:#eee;color:#111;text-decoration:none;border-radius:999px">Decline</a>
          </p>
        </div>
      `,
    },
    { idempotencyKey: `beta-request-approval/${request.id}` },
  );

  if (error) {
    throw new Error(`Resend beta request notification failed: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend beta request notification did not return an email id");
  }
  return data;
}

function renderDecisionPage(title: string, message: string) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#0a0a0a;color:#ededed;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center">
  <main style="max-width:560px;border:1px solid rgba(255,255,255,.2);border-radius:28px;padding:36px;background:radial-gradient(circle at 50% 0%,rgba(255,186,90,.12),transparent 35%),#0a0a0a;text-align:center;box-shadow:0 26px 140px rgba(0,0,0,.82)">
    <p style="color:#ffba5a;text-transform:uppercase;letter-spacing:.18em;font-size:12px">Agentic Engineering beta</p>
    <h1 style="font-size:42px;line-height:1;margin:12px 0;color:#fff">${escapeHtml(title)}</h1>
    <p style="color:rgba(255,255,255,.72);line-height:1.6">${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}
