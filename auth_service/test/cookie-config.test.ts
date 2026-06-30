import assert from "node:assert/strict";
import test from "node:test";
import { getCrossSubDomainCookieConfig } from "../src/cookie-config.js";

test("enables shared Better Auth cookies for production brianito subdomains", () => {
  assert.deepEqual(
    getCrossSubDomainCookieConfig({
      betterAuthUrl: "https://auth.brianito.com",
      trustedOrigins: [
        "https://learning.brianito.com",
        "https://api.brianito.com",
        "https://auth.brianito.com",
      ],
      isProduction: true,
    }),
    { enabled: true, domain: ".brianito.com" },
  );
});

test("enables shared cookies in production-like dev when sibling subdomains are trusted", () => {
  assert.deepEqual(
    getCrossSubDomainCookieConfig({
      betterAuthUrl: "https://auth.brianito.com",
      trustedOrigins: ["https://learning.brianito.com"],
      isProduction: false,
    }),
    { enabled: true, domain: ".brianito.com" },
  );
});

test("uses explicit AUTH_COOKIE_DOMAIN and normalizes the leading dot", () => {
  assert.deepEqual(
    getCrossSubDomainCookieConfig({
      betterAuthUrl: "https://auth.brianito.com",
      trustedOrigins: [],
      isProduction: false,
      cookieDomain: "brianito.com",
    }),
    { enabled: true, domain: ".brianito.com" },
  );
});

test("does not force cross-subdomain cookies for localhost development", () => {
  assert.equal(
    getCrossSubDomainCookieConfig({
      betterAuthUrl: "http://localhost:3000",
      trustedOrigins: ["http://localhost:5173"],
      isProduction: false,
    }),
    undefined,
  );
});
