/** Base URL for OAuth redirects. Set to localhost while developing. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Public Facebook page URL (optional). Set NEXT_PUBLIC_FACEBOOK_URL in .env.local */
export function getFacebookUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim();
  return url || null;
}
