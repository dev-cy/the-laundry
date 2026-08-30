import { createClient } from "@/lib/supabase/server";
import { shouldRedirectToCreatePassword } from "@/lib/auth/hash-callback";
import { markPasswordSetupRequired } from "@/app/auth/actions";
import { sanitizeNextPath } from "@/lib/security";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function redirectAfterAuth(
  origin: string,
  type: string | null,
  next: string,
  user: User | null
): Promise<NextResponse> {
  if (shouldRedirectToCreatePassword(user, type)) {
    if (type === "invite" || type === "signup") {
      await markPasswordSetupRequired();
    }
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return redirectAfterAuth(origin, type, next, user);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return redirectAfterAuth(origin, type, next, user);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
