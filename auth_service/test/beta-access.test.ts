import assert from "node:assert/strict";
import test from "node:test";
import {
  decideBetaAccessRequestWithQuery,
  evaluateBetaLoginAccess,
  getEmailFirstSigninPreflight,
  hasAdminSession,
  listBetaAccessEntries,
  resolveBetaAllowlistAdmin,
  submitBetaAccessRequest,
  upsertBetaAccessEntry,
} from "../src/beta-access.js";

type RequestRow = {
  id: string;
  email: string;
  preferred_name: string | null;
  whatsapp_contact: string | null;
  whatsapp_consent: boolean;
  status: "pending" | "approved" | "declined";
  approve_token_hash: string | null;
  decline_token_hash: string | null;
  notification_sent_at: Date | null;
  resend_email_id?: string | null;
  decided_at?: Date | null;
  created_at: Date;
  updated_at: Date;
};

function createFakeBetaDb() {
  const requests = new Map<string, RequestRow>();
  const betaAccess = new Map<string, { id: string; email: string; user_id: string | null; status: "invited" | "active" | "revoked"; created_at: Date; updated_at: Date }>();
  const now = new Date("2026-06-26T00:00:00.000Z");

  const query = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<{ rows: T[] }> => {
    if (sql.includes("INSERT INTO beta_access_requests")) {
      const [id, email, preferredName, whatsappContact, whatsappConsent, approveHash, declineHash] = params as [
        string,
        string,
        string | null,
        string | null,
        boolean,
        string,
        string,
      ];
      const existing = requests.get(email);
      const row: RequestRow = existing
        ? {
            ...existing,
            preferred_name: preferredName,
            whatsapp_contact: whatsappContact,
            whatsapp_consent: whatsappConsent,
            status: "pending",
            approve_token_hash:
              existing.status === "pending" && existing.notification_sent_at && existing.approve_token_hash
                ? existing.approve_token_hash
                : approveHash,
            decline_token_hash:
              existing.status === "pending" && existing.notification_sent_at && existing.decline_token_hash
                ? existing.decline_token_hash
                : declineHash,
            notification_sent_at: existing.status === "pending" ? existing.notification_sent_at : null,
            resend_email_id: existing.status === "pending" ? existing.resend_email_id : null,
            decided_at: existing.status === "pending" ? existing.decided_at : null,
            updated_at: now,
          }
        : {
            id,
            email,
            preferred_name: preferredName,
            whatsapp_contact: whatsappContact,
            whatsapp_consent: whatsappConsent,
            status: "pending",
            approve_token_hash: approveHash,
            decline_token_hash: declineHash,
            notification_sent_at: null,
            resend_email_id: null,
            decided_at: null,
            created_at: now,
            updated_at: now,
          };
      requests.set(email, row);
      return { rows: [row as T] };
    }

    if (sql.includes("INSERT INTO beta_access") && sql.includes("'invited'")) {
      const [email] = params as [string];
      if (!betaAccess.has(email)) {
        betaAccess.set(email, { id: `beta-${betaAccess.size + 1}`, email, user_id: null, status: "invited", created_at: now, updated_at: now });
      }
      return { rows: [] };
    }

    if (sql.includes("SELECT status FROM beta_access")) {
      const [email] = params as [string];
      const entry = betaAccess.get(email);
      return { rows: (entry ? [{ status: entry.status }] : []) as T[] };
    }

    if (sql.includes("SELECT id::text, email, user_id, status")) {
      return { rows: [...betaAccess.values()].sort((a, b) => a.email.localeCompare(b.email)) as T[] };
    }

    if (sql.includes("SELECT EXISTS") && sql.includes("providerId")) {
      const [email] = params as [string];
      return { rows: [{ has_password: email === "password@example.com" }] as T[] };
    }

    if (sql.includes("INSERT INTO beta_access") && sql.includes("user_id = COALESCE")) {
      const [email, userId, status] = params as [string, string | null, "invited" | "active" | "revoked"];
      const existing = betaAccess.get(email);
      betaAccess.set(email, {
        id: existing?.id ?? `beta-${betaAccess.size + 1}`,
        email,
        user_id: userId ?? existing?.user_id ?? null,
        status,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
      return { rows: [] };
    }

    if (sql.includes("INSERT INTO beta_access") && sql.includes("RETURNING id::text")) {
      const [email, status] = params as [string, "invited" | "active" | "revoked"];
      const existing = betaAccess.get(email);
      const entry = {
        id: existing?.id ?? `beta-${betaAccess.size + 1}`,
        email,
        user_id: existing?.user_id ?? null,
        status,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      betaAccess.set(email, entry);
      return { rows: [entry as T] };
    }

    if (sql.includes("UPDATE beta_access_requests SET notification_sent_at")) {
      const [id, resendEmailId] = params as [string, string];
      for (const row of requests.values()) {
        if (row.id === id) {
          row.notification_sent_at = now;
          row.resend_email_id = resendEmailId;
          row.updated_at = now;
        }
      }
      return { rows: [] };
    }

    if (sql.includes("UPDATE beta_access_requests") && sql.includes("WHERE approve_token_hash")) {
      const [status, approveHash] = params as ["approved", string];
      const row = [...requests.values()].find((request) => request.approve_token_hash === approveHash && request.status === "pending");
      if (!row) return { rows: [] };
      row.status = status;
      row.approve_token_hash = null;
      row.decline_token_hash = null;
      row.decided_at = now;
      row.updated_at = now;
      return { rows: [row as T] };
    }

    if (sql.includes("UPDATE beta_access_requests") && sql.includes("WHERE decline_token_hash")) {
      const [status, declineHash] = params as ["declined", string];
      const row = [...requests.values()].find((request) => request.decline_token_hash === declineHash && request.status === "pending");
      if (!row) return { rows: [] };
      row.status = status;
      row.approve_token_hash = null;
      row.decline_token_hash = null;
      row.decided_at = now;
      row.updated_at = now;
      return { rows: [row as T] };
    }

    if (sql.includes("INSERT INTO beta_access") && sql.includes("'active'")) {
      const [email] = params as [string];
      const existing = betaAccess.get(email);
      betaAccess.set(email, {
        id: existing?.id ?? `beta-${betaAccess.size + 1}`,
        email,
        user_id: existing?.user_id ?? null,
        status: "active",
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
      return { rows: [] };
    }

    throw new Error(`Unexpected query: ${sql}`);
  };

  return { query, requests, betaAccess };
}

test("beta request remains pending and approvable when admin notification fails", async () => {
  const fakeDb = createFakeBetaDb();
  const tokens = ["approve-token", "decline-token"];

  const result = await submitBetaAccessRequest(
    {
      email: "Student@Example.COM",
      preferredName: "Student",
      whatsappContact: "+15555550123",
      whatsappConsent: true,
    },
    {
      query: fakeDb.query,
      randomId: () => "request-1",
      randomToken: () => tokens.shift() ?? "unexpected-token",
      sendNotification: async () => {
        throw new Error("Resend unavailable");
      },
    },
  );

  assert.deepEqual(result, {
    email: "student@example.com",
    status: "pending",
    notification: "failed",
  });
  assert.equal(fakeDb.requests.get("student@example.com")?.status, "pending");
  assert.equal(fakeDb.requests.get("student@example.com")?.notification_sent_at, null);
  assert.equal(fakeDb.betaAccess.get("student@example.com")?.status, "invited");

  const approved = await decideBetaAccessRequestWithQuery("approve", "approve-token", fakeDb.query);

  assert.equal(approved?.email, "student@example.com");
  assert.equal(fakeDb.requests.get("student@example.com")?.status, "approved");
  assert.equal(fakeDb.betaAccess.get("student@example.com")?.status, "active");
});

test("beta login gate denies missing, invited, and revoked access", async () => {
  const fakeDb = createFakeBetaDb();
  fakeDb.betaAccess.set("invited@example.com", { id: "beta-1", email: "invited@example.com", user_id: null, status: "invited", created_at: new Date(), updated_at: new Date() });
  fakeDb.betaAccess.set("revoked@example.com", { id: "beta-2", email: "revoked@example.com", user_id: null, status: "revoked", created_at: new Date(), updated_at: new Date() });

  assert.deepEqual(
    await evaluateBetaLoginAccess({ id: "user-1", email: "new@example.com" }, "credential", { query: fakeDb.query }),
    { allowed: false, reason: "inactive_beta", email: "new@example.com" },
  );
  assert.deepEqual(
    await evaluateBetaLoginAccess({ id: "user-2", email: "invited@example.com" }, "credential", { query: fakeDb.query }),
    { allowed: false, reason: "inactive_beta", email: "invited@example.com" },
  );
  assert.deepEqual(
    await evaluateBetaLoginAccess({ id: "user-3", email: "revoked@example.com" }, "credential", { query: fakeDb.query }),
    { allowed: false, reason: "inactive_beta", email: "revoked@example.com" },
  );
  assert.deepEqual(
    await evaluateBetaLoginAccess({ id: "user-4", email: null }, "credential", { query: fakeDb.query }),
    { allowed: false, reason: "missing_email" },
  );
});

test("beta login gate allows active beta users and normalizes email", async () => {
  const fakeDb = createFakeBetaDb();
  fakeDb.betaAccess.set("active@example.com", { id: "beta-1", email: "active@example.com", user_id: null, status: "active", created_at: new Date(), updated_at: new Date() });

  const decision = await evaluateBetaLoginAccess(
    { id: "user-active", email: "Active@Example.COM" },
    "credential",
    { query: fakeDb.query },
  );

  assert.deepEqual(decision, { allowed: true, reason: "active_beta", email: "active@example.com" });
  assert.equal(fakeDb.betaAccess.get("active@example.com")?.status, "active");
});

test("google bootstrap admin is granted active beta and admin role idempotently", async () => {
  const fakeDb = createFakeBetaDb();
  const roleUpdates: Array<{ userId: string; role: "admin" }> = [];

  const runBootstrap = () => evaluateBetaLoginAccess(
    { id: "bootstrap-user", email: "Brian.Oliveira100@Gmail.com" },
    "google",
    {
      query: fakeDb.query,
      updateUserRole: async (userId, role) => {
        roleUpdates.push({ userId, role });
      },
    },
  );

  assert.deepEqual(await runBootstrap(), {
    allowed: true,
    reason: "google_bootstrap_admin",
    email: "brian.oliveira100@gmail.com",
  });
  assert.deepEqual(await runBootstrap(), {
    allowed: true,
    reason: "google_bootstrap_admin",
    email: "brian.oliveira100@gmail.com",
  });
  assert.equal(fakeDb.betaAccess.get("brian.oliveira100@gmail.com")?.status, "active");
  assert.deepEqual(roleUpdates, [
    { userId: "bootstrap-user", role: "admin" },
    { userId: "bootstrap-user", role: "admin" },
  ]);
});

test("bootstrap admin email is not auto-granted on credential sign-in", async () => {
  const fakeDb = createFakeBetaDb();
  let roleUpdated = false;

  const decision = await evaluateBetaLoginAccess(
    { id: "bootstrap-user", email: "brian.oliveira100@gmail.com" },
    "credential",
    {
      query: fakeDb.query,
      updateUserRole: async () => {
        roleUpdated = true;
      },
    },
  );

  assert.deepEqual(decision, {
    allowed: false,
    reason: "inactive_beta",
    email: "brian.oliveira100@gmail.com",
  });
  assert.equal(fakeDb.betaAccess.get("brian.oliveira100@gmail.com"), undefined);
  assert.equal(roleUpdated, false);
});

test("email-first signin preflight requires active beta before returning credential state", async () => {
  const fakeDb = createFakeBetaDb();
  fakeDb.betaAccess.set("password@example.com", { id: "beta-1", email: "password@example.com", user_id: "user-1", status: "active", created_at: new Date(), updated_at: new Date() });
  fakeDb.betaAccess.set("new@example.com", { id: "beta-2", email: "new@example.com", user_id: null, status: "active", created_at: new Date(), updated_at: new Date() });
  fakeDb.betaAccess.set("invited@example.com", { id: "beta-3", email: "invited@example.com", user_id: null, status: "invited", created_at: new Date(), updated_at: new Date() });

  assert.deepEqual(
    await getEmailFirstSigninPreflight({ email: "Password@Example.COM" }, fakeDb.query),
    { email: "password@example.com", credential_state: "has_password" },
  );
  assert.deepEqual(
    await getEmailFirstSigninPreflight({ email: "New@Example.COM" }, fakeDb.query),
    { email: "new@example.com", credential_state: "needs_password_setup" },
  );
  await assert.rejects(
    () => getEmailFirstSigninPreflight({ email: "invited@example.com" }, fakeDb.query),
    /beta access required/,
  );
  await assert.rejects(
    () => getEmailFirstSigninPreflight({ email: "bad-email" }, fakeDb.query),
    /invalid email/,
  );
});

test("allowlist upsert validates status and lowercases email", async () => {
  const fakeDb = createFakeBetaDb();

  const entry = await upsertBetaAccessEntry(
    { email: "Invited@Example.COM", status: "active" },
    fakeDb.query,
  );

  assert.equal(entry.email, "invited@example.com");
  assert.equal(entry.status, "active");
  assert.equal(fakeDb.betaAccess.get("invited@example.com")?.status, "active");
  await assert.rejects(
    () => upsertBetaAccessEntry({ email: "bad-email", status: "active" }, fakeDb.query),
    /invalid email/,
  );
  await assert.rejects(
    () => upsertBetaAccessEntry({ email: "student@example.com", status: "pending" }, fakeDb.query),
    /invalid status/,
  );
});

test("allowlist list returns normalized beta_access rows", async () => {
  const fakeDb = createFakeBetaDb();
  await upsertBetaAccessEntry({ email: "B@Example.COM", status: "revoked" }, fakeDb.query);
  await upsertBetaAccessEntry({ email: "A@Example.COM", status: "invited" }, fakeDb.query);

  const entries = await listBetaAccessEntries(fakeDb.query);

  assert.deepEqual(
    entries.map((entry) => ({ email: entry.email, status: entry.status })),
    [
      { email: "a@example.com", status: "invited" },
      { email: "b@example.com", status: "revoked" },
    ],
  );
});

test("allowlist admin helper only accepts Better Auth admin role", () => {
  assert.equal(hasAdminSession({ user: { role: "admin" } }), true);
  assert.equal(hasAdminSession({ user: { role: "member, admin" } }), true);
  assert.equal(hasAdminSession({ user: { role: "member" } }), false);
  assert.equal(hasAdminSession({ user: {} }), false);
  assert.equal(hasAdminSession(null), false);
});

test("allowlist admin auth falls back to the Better Auth handler when direct session lookup is empty", async () => {
  const headers = new Headers({ cookie: "better-auth.session_token=signed-session" });
  let fallbackCalled = false;

  const result = await resolveBetaAllowlistAdmin(headers, {
    getSession: async () => null,
    getFallbackSession: async (receivedHeaders) => {
      fallbackCalled = true;
      assert.equal(receivedHeaders.get("cookie"), "better-auth.session_token=signed-session");
      return { user: { role: "admin" }, session: { id: "session-1" } };
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(fallbackCalled, true);
});

test("allowlist admin auth preserves 401 for anonymous users and 403 for non-admin sessions", async () => {
  assert.deepEqual(
    await resolveBetaAllowlistAdmin(new Headers(), {
      getSession: async () => null,
      getFallbackSession: async () => null,
    }),
    { ok: false, status: 401, error: "authentication required" },
  );

  assert.deepEqual(
    await resolveBetaAllowlistAdmin(new Headers({ cookie: "better-auth.session_token=student" }), {
      getSession: async () => ({ user: { role: "student" }, session: { id: "session-2" } }),
      getFallbackSession: async () => {
        throw new Error("fallback should not be called when direct session exists");
      },
    }),
    { ok: false, status: 403, error: "admin access required" },
  );
});
