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
  if (user?.app_metadata?.needs_password_setup === true) return "/create-password";
  if (type === "recovery" || type === "invite" || type === "signup") {
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
  "invite -> create-password",
  getPostHashAuthPath({ app_metadata: {} }, "invite") === "/create-password"
);
assert(
  "signup -> create-password",
  getPostHashAuthPath({ app_metadata: {} }, "signup") === "/create-password"
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

function buildPeriodIncome(sales, expenseTotal) {
  const grossIncome = sales.cashReceived;
  return {
    grossIncome,
    totalExpenses: expenseTotal,
    netIncome: grossIncome - expenseTotal,
  };
}

function canAccessAdminPath(role, pathname) {
  if (role === "super_admin" || role === "admin") return true;
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/reports") ||
    pathname.startsWith("/admin/transactions") ||
    pathname.startsWith("/admin/attendance")
  );
}

console.log("\ncanAccessAdminPath:");
assert("staff can open reports", canAccessAdminPath("staff", "/admin/reports"));
assert("staff can open sign-in", canAccessAdminPath("staff", "/admin/attendance"));
assert("staff blocked from expenses", !canAccessAdminPath("staff", "/admin/expenses"));
assert(
  "staff blocked from sign-in overview",
  !canAccessAdminPath("staff", "/admin/sign-in-overview")
);
assert("staff blocked from payroll", !canAccessAdminPath("staff", "/admin/payroll"));
assert("admin can open expenses", canAccessAdminPath("admin", "/admin/expenses"));
assert(
  "admin can open sign-in overview",
  canAccessAdminPath("admin", "/admin/sign-in-overview")
);

function getCanonicalRedirectLocation(requestUrl, context, siteUrl) {
  const raw = siteUrl?.trim();
  if (!raw) return null;
  let canonical;
  try {
    canonical = new URL(raw).origin;
    const host = new URL(canonical).hostname;
    if (host === "localhost" || host === "127.0.0.1") return null;
  } catch {
    return null;
  }
  const incoming = new URL(requestUrl);
  if (incoming.hostname === new URL(canonical).hostname) return null;
  if (incoming.hostname === "localhost") return null;
  const isDefaultNetlify = incoming.hostname === "the-laundry.netlify.app";
  const isNetlifyApp = incoming.hostname.endsWith(".netlify.app");
  if (!isDefaultNetlify && !(isNetlifyApp && context === "production")) return null;
  return new URL(incoming.pathname + incoming.search, canonical).toString();
}

console.log("\ncanonical host redirect:");
const prod = "https://the-laundry.cyregjr.com";
assert(
  "netlify.app production -> subdomain",
  getCanonicalRedirectLocation(
    "https://the-laundry.netlify.app/admin/sign-in-overview",
    "production",
    prod
  ) === "https://the-laundry.cyregjr.com/admin/sign-in-overview"
);
assert(
  "unique production deploy -> subdomain",
  getCanonicalRedirectLocation(
    "https://6a93f625f0cc67000865930d--the-laundry.netlify.app/admin",
    "production",
    prod
  ) === "https://the-laundry.cyregjr.com/admin"
);
assert(
  "deploy preview stays",
  getCanonicalRedirectLocation(
    "https://123--the-laundry.netlify.app/admin",
    "deploy-preview",
    prod
  ) === null
);
assert(
  "already on subdomain",
  getCanonicalRedirectLocation(`${prod}/admin`, "production", prod) === null
);
assert(
  "localhost ignored",
  getCanonicalRedirectLocation("http://localhost:3000/admin", "production", prod) === null
);

console.log("\nbuildPeriodIncome:");
assert(
  "net = gross - expenses",
  buildPeriodIncome({ cashReceived: 10000, totalSales: 12000, unpaid: 2000 }, 3000).netIncome ===
    7000
);
assert(
  "gross uses cash received",
  buildPeriodIncome({ cashReceived: 5000, totalSales: 5000, unpaid: 0 }, 0).grossIncome === 5000
);

console.log(failed ? `\n${failed} failed` : `\nAll ${passed} checks passed.`);
process.exit(failed ? 1 : 0);
