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
