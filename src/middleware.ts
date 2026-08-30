import { type NextRequest, NextResponse } from "next/server";
import { getCanonicalRedirectLocation } from "@/lib/site-url";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const canonical = getCanonicalRedirectLocation(request.url);
  if (canonical) {
    return NextResponse.redirect(canonical, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: ["/", "/admin/:path*", "/login", "/create-password", "/auth/callback"],
};
