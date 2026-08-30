/** Safe relative path for post-auth redirects (blocks open redirects). */
export function sanitizeNextPath(
  next: string | null | undefined,
  fallback = "/admin"
): string {
  if (!next) return fallback;
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("\\") || path.includes("://") || path.includes("@")) return fallback;
  return path;
}

function allowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).origin);
    } catch {
      // ignore invalid env
    }
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    allowed.add(`${proto}://${host}`);
    if (proto === "http") allowed.add(`https://${host}`);
  }
  return allowed;
}

function headerOrigin(value: string | null, allowed: Set<string>): boolean {
  if (!value) return false;
  try {
    return allowed.has(new URL(value).origin);
  } catch {
    return false;
  }
}

/** CSRF guard for cookie-authenticated mutating API routes. */
export function isSameOriginRequest(request: Request): boolean {
  const allowed = allowedOrigins(request);
  if (allowed.size === 0) return false;
  const origin = request.headers.get("origin");
  if (origin) return headerOrigin(origin, allowed);
  const referer = request.headers.get("referer");
  if (referer) return headerOrigin(referer, allowed);
  return false;
}
