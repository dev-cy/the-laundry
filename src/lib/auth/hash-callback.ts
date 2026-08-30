import type { User } from "@supabase/supabase-js";

type AuthUserLike = Pick<User, "app_metadata"> | null;

/** Invite, first signup, and recovery must set a password in Supabase Auth. */
export function shouldRedirectToCreatePassword(
  user: AuthUserLike,
  type: string | null
): boolean {
  if (user?.app_metadata?.needs_password_setup === true) return true;
  return type === "recovery" || type === "invite" || type === "signup";
}

/** Post-auth destination after hash/callback. */
export function getPostHashAuthPath(
  user: AuthUserLike,
  type: string | null
): "/create-password" | "/admin" {
  return shouldRedirectToCreatePassword(user, type) ? "/create-password" : "/admin";
}

export function parseAuthHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

export function hasAuthHashTokens(params: URLSearchParams): boolean {
  return Boolean(params.get("access_token") && params.get("refresh_token"));
}

/** Merge auth `type` from hash fragment and query string (invite links may split them). */
export function getAuthFlowType(
  hashParams: URLSearchParams,
  searchParams: URLSearchParams
): string | null {
  return hashParams.get("type") ?? searchParams.get("type");
}
