import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canManageUsers,
  getUserRole,
  type AppRole,
} from "@/lib/auth/roles";
import { isSameOriginRequest } from "@/lib/security";
import { getAuthCallbackUrl } from "@/lib/site-url";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

function forbiddenOrigin() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function isValidRole(role: unknown): role is AppRole {
  return role === "super_admin" || role === "admin" || role === "staff";
}

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOrigin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actorRole = user ? getUserRole(user) : null;
  if (!user || !actorRole || !canManageUsers(actorRole)) return unauthorized();

  const body = (await request.json()) as {
    email?: string;
    role?: AppRole;
    branchId?: string | null;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role;
  const branchId = body.branchId ?? null;

  if (!isValidEmail(email) || !isValidRole(role)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (role === "super_admin" && actorRole !== "super_admin") {
    return NextResponse.json(
      { error: "Only a Super Admin can invite a Super Admin." },
      { status: 403 }
    );
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
    const redirectTo = getAuthCallbackUrl("invite");

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const invitedUser = data.user;
    if (!invitedUser) {
      return NextResponse.json({ error: "Invite sent but user record was not returned." }, { status: 500 });
    }

    const appMeta = invitedUser.app_metadata ?? {};
    const userMeta = { ...(invitedUser.user_metadata ?? {}) };
    delete userMeta.role;
    delete userMeta.branch_id;

    const { error: updateError } = await admin.auth.admin.updateUserById(invitedUser.id, {
      app_metadata: {
        ...appMeta,
        role,
        branch_id: role === "staff" ? branchId : null,
      },
      user_metadata: userMeta,
    });

    if (updateError) {
      return NextResponse.json(
        {
          error: `Invite email sent, but role assignment failed: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, userId: invitedUser.id, redirectTo });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to invite user." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !canManageUsers(getUserRole(user))) return unauthorized();

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
      branch_id: (u.app_metadata?.branch_id as string | undefined) ?? null,
    }));
    return NextResponse.json({
      users,
      branches: branches ?? [],
      currentUserRole: getUserRole(user),
      currentUserId: user.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch users." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOrigin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actorRole = user ? getUserRole(user) : null;
  if (!user || actorRole !== "super_admin") return unauthorized();

  const body = (await request.json()) as { userId?: string };
  const userId = body.userId ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data: found, error: fetchError } = await admin.auth.admin.getUserById(userId);
    if (fetchError || !found?.user) {
      return NextResponse.json({ error: fetchError?.message ?? "User not found." }, { status: 404 });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete user." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return forbiddenOrigin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actorRole = user ? getUserRole(user) : null;
  if (!user || !actorRole || !canManageUsers(actorRole)) return unauthorized();

  const body = (await request.json()) as { userId?: string; role?: AppRole; branchId?: string | null };
  const userId = body.userId ?? "";
  const role = body.role;
  const branchId = body.branchId ?? null;
  if (!userId || !isValidRole(role)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Only super admins can assign or change the super_admin role.
  if (role === "super_admin" && actorRole !== "super_admin") {
    return NextResponse.json(
      { error: "Only a Super Admin can assign the Super Admin role." },
      { status: 403 }
    );
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

    const targetRole = getUserRole(found.user);

    // Regular admins cannot change an existing super_admin.
    if (targetRole === "super_admin" && actorRole !== "super_admin") {
      return NextResponse.json(
        { error: "Only a Super Admin can change another Super Admin." },
        { status: 403 }
      );
    }

    // Prevent demoting yourself if you are the last super admin.
    if (
      user.id === userId &&
      actorRole === "super_admin" &&
      role !== "super_admin"
    ) {
      const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const otherSuperAdmins = (listed?.users ?? []).filter(
        (u) => u.id !== userId && getUserRole(u) === "super_admin"
      );
      if (otherSuperAdmins.length === 0) {
        return NextResponse.json(
          { error: "Cannot demote the last Super Admin. Promote another user first." },
          { status: 400 }
        );
      }
    }

    const appMeta = found.user.app_metadata ?? {};
    const userMeta = { ...(found.user.user_metadata ?? {}) };
    // Role/branch for auth live only in app_metadata (clients can edit user_metadata).
    delete userMeta.role;
    delete userMeta.branch_id;

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...appMeta, role, branch_id: role === "staff" ? branchId : null },
      user_metadata: userMeta,
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
