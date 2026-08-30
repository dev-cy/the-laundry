/** Base URL for OAuth redirects. Set to localhost while developing. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Production origin from NEXT_PUBLIC_SITE_URL, or null while developing locally. */
export function getCanonicalOrigin(
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL
): string | null {
  const raw = siteUrl?.trim();
  if (!raw) return null;
  try {
    const origin = new URL(raw).origin;
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return null;
    }
    return origin;
  } catch {
    return null;
  }
}

function defaultNetlifyHost(): string {
  const siteName = process.env.SITE_NAME?.trim();
  return siteName ? `${siteName}.netlify.app` : "the-laundry.netlify.app";
}

/**
 * Send production Netlify hosts (the-laundry.netlify.app and unique deploy
 * permalinks) to the custom domain. Deploy previews stay on their own URL.
 */
export function getCanonicalRedirectLocation(
  requestUrl: string,
  context = process.env.CONTEXT ?? ""
): string | null {
  const canonical = getCanonicalOrigin();
  if (!canonical) return null;

  let incoming: URL;
  try {
    incoming = new URL(requestUrl);
  } catch {
    return null;
  }

  const canonicalHost = new URL(canonical).hostname;
  if (incoming.hostname === canonicalHost) return null;
  if (incoming.hostname === "localhost" || incoming.hostname === "127.0.0.1") {
    return null;
  }

  const isDefaultNetlify = incoming.hostname === defaultNetlifyHost();
  const isNetlifyApp = incoming.hostname.endsWith(".netlify.app");
  const isProduction = context === "production";
  if (!isDefaultNetlify && !(isNetlifyApp && isProduction)) return null;

  return new URL(incoming.pathname + incoming.search, canonical).toString();
}

export type AuthCallbackType = "invite" | "signup" | "magiclink" | "recovery";

/** Redirect target for Supabase email links (invite, magic link, etc.). */
export function getAuthCallbackUrl(type?: AuthCallbackType): string {
  const base = `${getSiteUrl()}/auth/callback`;
  if (!type) return base;
  return `${base}?type=${encodeURIComponent(type)}`;
}

/** Public Facebook page URL (optional). Set NEXT_PUBLIC_FACEBOOK_URL in .env.local */
export function getFacebookUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim();
  return url || null;
}
