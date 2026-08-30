"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { markPasswordSetupRequired } from "@/app/auth/actions";
import {
  getAuthFlowType,
  getPostHashAuthPath,
  hasAuthHashTokens,
  parseAuthHashParams,
} from "@/lib/auth/hash-callback";

/**
 * Invite/magic-link emails sometimes return tokens in the URL hash
 * (`#access_token=...`). The server never sees that fragment, so we
 * exchange the tokens in the browser, strip them from the URL, then continue.
 */
export function AuthHashHandler() {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const hashParams = parseAuthHashParams(window.location.hash);
    if (!hasAuthHashTokens(hashParams)) return;

    handled.current = true;
    const searchParams = new URLSearchParams(window.location.search);
    const type = getAuthFlowType(hashParams, searchParams);
    const accessToken = hashParams.get("access_token")!;
    const refreshToken = hashParams.get("refresh_token")!;
    const supabase = createClient();

    void (async () => {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Always remove tokens from the address bar (history, copy/paste, referrers).
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );

      if (sessionError) {
        window.location.replace("/login?error=auth");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.replace("/login?error=auth");
        return;
      }

      const dest = getPostHashAuthPath(user, type);
      if (type === "invite" || type === "signup") {
        await markPasswordSetupRequired();
      }
      window.location.replace(dest);
    })();
  }, []);

  return null;
}
