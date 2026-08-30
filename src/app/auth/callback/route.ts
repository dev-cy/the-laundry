import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/security";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function redirectAfterAuth(
  origin: string,
  type: string | null,
  next: string
): NextResponse {
  if (type === "signup" || type === "invite") {
    return NextResponse.redirect(`${origin}/create-password`);
  }
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/create-password`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = sanitizeNextPath(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectAfterAuth(origin, type, next);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      return redirectAfterAuth(origin, type, next);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
