import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Context } from "hono";
import { Resend } from "resend";
import { auth } from "./auth.js";
import { db } from "./db.js";
import { env } from "./env.js";

type BetaStatus = "invited" | "active" | "revoked";
type BetaRequestStatus = "pending" | "approved" | "declined";
type BetaDecision = "approve" | "decline";

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

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

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

export async function getBetaAccess(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.email) {
    return c.json({ authenticated: false, beta_access: false, status: "anonymous" }, 401);
  }

  const email = normalizeEmail(session.user.email);
  const result = await db.query<{ status: BetaStatus }>(
    "SELECT status FROM beta_access WHERE email = $1 LIMIT 1",
    [email],
  );
  const status = result.rows[0]?.status ?? "invited";
  return c.json({
    authenticated: true,
    beta_access: status === "active",
    status,
    email,
  });
}

export async function upsertBetaAccess(c: Context) {
  const body = await c.req.json<{ email?: string; status?: BetaStatus }>();
  if (!body.email) {
    return c.json({ error: "email is required" }, 400);
  }
  const status = body.status ?? "invited";
  if (!["invited", "active", "revoked"].includes(status)) {
    return c.json({ error: "invalid status" }, 400);
  }
  const email = normalizeEmail(body.email);
  const result = await db.query(
    `INSERT INTO beta_access (email, status)
     VALUES ($1, $2)
     ON CONFLICT (email)
     DO UPDATE SET status = EXCLUDED.status, updated_at = now()
     RETURNING id, email, user_id, status, created_at, updated_at`,
    [email, status],
  );
  return c.json(result.rows[0], 201);
}

export async function createBetaAccessRequest(c: Context) {
  const body = await c.req.json<{
    email?: string;
    preferredName?: string;
    whatsappContact?: string;
    whatsappConsent?: boolean;
  }>().catch(() => null);

  const email = normalizeEmail(body?.email ?? "");
  if (!email || !isValidEmail(email)) {
    return c.json({ error: "invalid email" }, 400);
  }

  const preferredName = normalizeOptionalText(body?.preferredName);
  const whatsappConsent = body?.whatsappConsent === true;
  const whatsappContact = whatsappConsent ? normalizeOptionalText(body?.whatsappContact) : null;
  const approveToken = randomBytes(32).toString("base64url");
  const declineToken = randomBytes(32).toString("base64url");

  const result = await db.query<BetaRequestRow>(
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
       approve_token_hash = CASE WHEN beta_access_requests.status = 'pending' AND beta_access_requests.approve_token_hash IS NOT NULL THEN beta_access_requests.approve_token_hash ELSE EXCLUDED.approve_token_hash END,
       decline_token_hash = CASE WHEN beta_access_requests.status = 'pending' AND beta_access_requests.decline_token_hash IS NOT NULL THEN beta_access_requests.decline_token_hash ELSE EXCLUDED.decline_token_hash END,
       notification_sent_at = CASE WHEN beta_access_requests.status = 'pending' THEN beta_access_requests.notification_sent_at ELSE NULL END,
       resend_email_id = CASE WHEN beta_access_requests.status = 'pending' THEN beta_access_requests.resend_email_id ELSE NULL END,
       decided_at = CASE WHEN beta_access_requests.status = 'pending' THEN beta_access_requests.decided_at ELSE NULL END,
       updated_at = now()
     RETURNING id, email, preferred_name, whatsapp_contact, whatsapp_consent, status, approve_token_hash, decline_token_hash, notification_sent_at, created_at, updated_at`,
    [randomUUID(), email, preferredName, whatsappContact, whatsappConsent, tokenHash(approveToken), tokenHash(declineToken)],
  );

  const request = result.rows[0];
  if (!request) {
    return c.json({ error: "could not save beta request" }, 500);
  }

  if (!request.notification_sent_at) {
    const sent = await sendBetaRequestNotification(request, approveToken, declineToken);
    await db.query(
      "UPDATE beta_access_requests SET notification_sent_at = now(), resend_email_id = $2, updated_at = now() WHERE id = $1",
      [request.id, sent.id],
    );
  }

  return c.json(
    {
      email: request.email,
      status: "pending",
      message: "Request sent — we’ll notify you by email or WhatsApp.",
    },
    202,
  );
}

export async function decideBetaAccessRequest(c: Context) {
  const decision = c.req.param("decision") as BetaDecision;
  const token = c.req.param("token");
  if (!["approve", "decline"].includes(decision) || !token) {
    return c.json({ error: "invalid approval link" }, 400);
  }

  const tokenColumn = decision === "approve" ? "approve_token_hash" : "decline_token_hash";
  const result = await db.query<BetaRequestRow>(
    `UPDATE beta_access_requests
     SET status = $1, approve_token_hash = NULL, decline_token_hash = NULL, decided_at = now(), updated_at = now()
     WHERE ${tokenColumn} = $2 AND status = 'pending'
     RETURNING id, email, preferred_name, whatsapp_contact, whatsapp_consent, status, approve_token_hash, decline_token_hash, notification_sent_at, created_at, updated_at`,
    [decision === "approve" ? "approved" : "declined", tokenHash(token)],
  );

  const request = result.rows[0];
  if (!request) {
    return c.html(renderDecisionPage("Invalid or expired link", "This beta request link has already been used or does not exist."), 400);
  }

  if (decision === "approve") {
    await db.query(
      `INSERT INTO beta_access (email, status)
       VALUES ($1, 'active')
       ON CONFLICT (email)
       DO UPDATE SET status = 'active', updated_at = now()`,
      [request.email],
    );
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
