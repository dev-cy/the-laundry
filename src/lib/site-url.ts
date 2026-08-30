/** Base URL for OAuth redirects. Set to localhost while developing. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
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
