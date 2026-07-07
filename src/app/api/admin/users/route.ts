import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole, type AppRole } from "@/lib/auth/roles";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== "admin") return unauthorized();

  try {
    const admin = createAdminClient();
    const [{ data, error }, { data: branches, error: branchesError }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabase.from("branches").select("id, name").order("name"),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (branchesError) return NextResponse.json({ error: branchesError.message }, { status: 400 });

    const users = (data.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "-",
      created_at: u.created_at,
      role: getUserRole(u),
      branch_id:
        (u.app_metadata?.branch_id as string | undefined) ??
        (u.user_metadata?.branch_id as string | undefined) ??
        null,
    }));
    return NextResponse.json({ users, branches: branches ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch users." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || getUserRole(user) !== "admin") return unauthorized();

  const body = (await request.json()) as { userId?: string; role?: AppRole; branchId?: string | null };
  const userId = body.userId ?? "";
  const role = body.role;
  const branchId = body.branchId ?? null;
  if (!userId || (role !== "admin" && role !== "staff")) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (role === "staff" && !branchId) {
    return NextResponse.json({ error: "Assigned branch is required for staff role." }, { status: 400 });
  }

  if (role === "staff" && branchId) {
    const { data: branch } = await supabase.from("branches").select("id").eq("id", branchId).maybeSingle();
    if (!branch) {
      return NextResponse.json({ error: "Assigned branch is invalid." }, { status: 400 });
    }
  }

  try {
    const admin = createAdminClient();
    const { data: found, error: fetchError } = await admin.auth.admin.getUserById(userId);
    if (fetchError || !found?.user) {
      return NextResponse.json({ error: fetchError?.message ?? "User not found." }, { status: 404 });
    }

    const appMeta = found.user.app_metadata ?? {};
    const userMeta = found.user.user_metadata ?? {};
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...appMeta, role, branch_id: role === "staff" ? branchId : null },
      user_metadata: { ...userMeta, role, branch_id: role === "staff" ? branchId : null },
    });
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update role." },
      { status: 500 }
    );
  }
}
