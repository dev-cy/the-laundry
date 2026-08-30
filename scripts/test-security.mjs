/**
 * Security helper smoke tests (redirect sanitization + same-origin logic).
 * Run: node scripts/test-security.mjs
 */

function sanitizeNextPath(next, fallback = "/admin") {
  if (!next) return fallback;
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("\\") || path.includes("://") || path.includes("@")) return fallback;
  return path;
}

function allowedOrigins(headers) {
  const allowed = new Set();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).origin);
    } catch {
      /* ignore */
    }
  }
  const host = headers["x-forwarded-host"] ?? headers.host;
  if (host) {
    const proto = headers["x-forwarded-proto"] ?? "http";
    allowed.add(`${proto}://${host}`);
    if (proto === "http") allowed.add(`https://${host}`);
  }
  return allowed;
}

function isSameOriginRequest(headers) {
  const allowed = allowedOrigins(headers);
  if (allowed.size === 0) return false;
  const origin = headers.origin;
  if (origin) {
    try {
      return allowed.has(new URL(origin).origin);
    } catch {
      return false;
    }
  }
  const referer = headers.referer;
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return false;
}

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("Security helper tests\n");

console.log("sanitizeNextPath:");
assert("/admin ok", sanitizeNextPath("/admin/reports") === "/admin/reports");
assert("blocks //evil", sanitizeNextPath("//evil.com") === "/admin");
assert("blocks absolute url", sanitizeNextPath("https://evil.com") === "/admin");
assert("blocks backslash", sanitizeNextPath("/\\evil") === "/admin");
assert("default", sanitizeNextPath(null) === "/admin");

function getPostHashAuthPath(user, type) {
  if (user?.app_metadata?.needs_password_setup === true) {
    return "/create-password";
  }
  if (type === "recovery") {
    return "/create-password";
  }
  return "/admin";
}

function hasAuthHashTokens(params) {
  return Boolean(params.get("access_token") && params.get("refresh_token"));
}

console.log("\ngetPostHashAuthPath:");
assert(
  "needs_password_setup -> create-password",
  getPostHashAuthPath({ app_metadata: { needs_password_setup: true } }, null) ===
    "/create-password"
);
assert(
  "spoofed type ignored without flag",
  getPostHashAuthPath({ app_metadata: {} }, "invite") === "/admin"
);
assert("recovery -> create-password", getPostHashAuthPath(null, "recovery") === "/create-password");
assert("magiclink -> admin", getPostHashAuthPath({ app_metadata: {} }, "magiclink") === "/admin");
assert("null user -> admin", getPostHashAuthPath(null, null) === "/admin");

console.log("\nhasAuthHashTokens:");
assert(
  "requires both tokens",
  hasAuthHashTokens(new URLSearchParams("access_token=a&refresh_token=b"))
);
assert(
  "rejects access_token only",
  !hasAuthHashTokens(new URLSearchParams("access_token=a"))
);
assert(
  "rejects empty",
  !hasAuthHashTokens(new URLSearchParams(""))
);

console.log("\nisSameOriginRequest:");
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
assert(
  "allows matching origin",
  isSameOriginRequest({
    host: "localhost:3000",
    origin: "http://localhost:3000",
  })
);
assert(
  "blocks foreign origin",
  !isSameOriginRequest({
    host: "localhost:3000",
    origin: "https://evil.example",
  })
);
assert(
  "blocks missing origin/referer",
  !isSameOriginRequest({ host: "localhost:3000" })
);
assert(
  "allows referer fallback",
  isSameOriginRequest({
    host: "localhost:3000",
    referer: "http://localhost:3000/admin/users",
  })
);

console.log(failed ? `\n${failed} failed` : `\nAll ${passed} checks passed.`);
process.exit(failed ? 1 : 0);
