import type { BetterAuthOptions } from "better-auth";

export type CrossSubDomainCookieConfig = NonNullable<
  NonNullable<BetterAuthOptions["advanced"]>["crossSubDomainCookies"]
>;

function getHostname(origin: string) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getRegistrableDomain(hostname: string) {
  if (isLocalHostname(hostname)) return null;

  const labels = hostname.split(".").filter(Boolean);
  if (labels.length < 2) return null;

  return labels.slice(-2).join(".");
}

function normalizeCookieDomain(domain: string | undefined) {
  const trimmed = domain?.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

export function getCrossSubDomainCookieConfig({
  betterAuthUrl,
  trustedOrigins,
  isProduction,
  cookieDomain,
}: {
  betterAuthUrl: string;
  trustedOrigins: string[];
  isProduction: boolean;
  cookieDomain?: string;
}): CrossSubDomainCookieConfig | undefined {
  const configuredDomain = normalizeCookieDomain(cookieDomain);
  if (configuredDomain) {
    return { enabled: true, domain: configuredDomain };
  }

  const authHostname = getHostname(betterAuthUrl);
  if (!authHostname) return undefined;

  const rootDomain = getRegistrableDomain(authHostname);
  if (!rootDomain) return undefined;

  const hasSiblingTrustedOrigin = trustedOrigins.some((origin) => {
    const hostname = getHostname(origin);
    return (
      hostname !== null &&
      hostname !== authHostname &&
      getRegistrableDomain(hostname) === rootDomain
    );
  });

  if (!isProduction && !hasSiblingTrustedOrigin) return undefined;

  return {
    enabled: true,
    domain: `.${rootDomain}`,
  };
}
