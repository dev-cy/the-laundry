"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { needsPasswordSetup } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Keep invite/signup users on /create-password until they save a password. */
export async function markPasswordSetupRequired(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || needsPasswordSetup(user)) return;

  try {
    const admin = createAdminClient();
    const appMeta = user.app_metadata ?? {};
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...appMeta, needs_password_setup: true },
    });
  } catch {
    // Password page still works; middleware just won't force it.
  }
}

export async function setInitialPassword(
  password: string,
  confirmPassword: string
): Promise<{ error?: string }> {
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session expired. Open the invite link again or sign in." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: updateError.message };
  }

  try {
    const admin = createAdminClient();
    const appMeta = user.app_metadata ?? {};
    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...appMeta, needs_password_setup: false },
    });
    if (metaError) {
      return { error: metaError.message };
    }
  } catch {
    // Password is already saved in Supabase Auth.
  }

  return {};
}
