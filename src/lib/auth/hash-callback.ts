import type { User } from "@supabase/supabase-js";

type AuthUserLike = Pick<User, "app_metadata"> | null;

/** Post-auth destination after hash/callback — uses server metadata, not URL type alone. */
export function getPostHashAuthPath(
  user: AuthUserLike,
  type: string | null
): "/create-password" | "/admin" {
  if (user?.app_metadata?.needs_password_setup === true) {
    return "/create-password";
  }
  if (type === "recovery") {
    return "/create-password";
  }
  return "/admin";
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
