#!/usr/bin/env node
/** Smoke-test Supabase schema, RPCs, and key tables after migrations. */

import fs from "fs";
import path from "path";
import ws from "ws";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = path.join(process.cwd(), ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function ok(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
  process.exitCode = 1;
}

async function main() {
  loadEnvFile(ENV_PATH);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !serviceKey || !publishableKey) {
    fail("Missing Supabase env vars in .env.local");
    return;
  }

  const clientOptions = {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  };
  const admin = createClient(url, serviceKey, clientOptions);
  const anon = createClient(url, publishableKey, clientOptions);

  console.log("Supabase smoke tests\n");

  // Tables + joins
  const { data: branches, error: branchesError } = await admin
    .from("branches")
    .select("id, name")
    .order("name");
  if (branchesError) fail("branches table", branchesError.message);
  else ok(`branches (${branches?.length ?? 0} rows)`);

  const { data: catalog, error: catalogError } = await admin
    .from("inventory_catalog")
    .select("id, sku, item_name")
    .limit(5);
  if (catalogError) fail("inventory_catalog table", catalogError.message);
  else ok(`inventory_catalog (${catalog?.length ?? 0} sample rows)`);

  const { data: stock, error: stockError } = await admin
    .from("inventory")
    .select("id, branch_id, catalog_id, quantity, inventory_catalog(sku, item_name)")
    .limit(5);
  if (stockError) fail("inventory + catalog join", stockError.message);
  else ok(`inventory stock rows with catalog join (${stock?.length ?? 0} sample)`);

  // Sync: each catalog item should exist at every branch
  if (catalog?.length && branches?.length) {
    const { count, error: syncError } = await admin
      .from("inventory")
      .select("id", { count: "exact", head: true })
      .eq("catalog_id", catalog[0].id);
    if (syncError) fail("inventory sync check", syncError.message);
    else if (count === branches.length) ok("catalog item has row per branch");
    else
      fail(
        "catalog sync",
        `expected ${branches.length} branch rows, found ${count}`
      );
  }

  // RPCs (service role — validates functions exist and execute)
  const today = new Date().toISOString().slice(0, 10);
  const { error: dashError } = await admin.rpc("get_dashboard_stats", {
    p_branch_id: null,
    p_today: today,
  });
  if (dashError) fail("get_dashboard_stats RPC", dashError.message);
  else ok("get_dashboard_stats RPC");

  const { data: dashData } = await admin.rpc("get_dashboard_stats", {
    p_branch_id: null,
    p_today: today,
  });
  if (dashData?.daily && dashData?.monthly && dashData?.allTime) {
    ok("dashboard stats shape (daily/monthly/allTime)");
  } else {
    fail("dashboard stats shape", JSON.stringify(dashData));
  }

  // Transactions / reports readable
  const { error: txError } = await admin.from("transactions").select("id").limit(1);
  if (txError) fail("transactions table", txError.message);
  else ok("transactions table");

  const { error: reportsError } = await admin.from("daily_reports").select("id").limit(1);
  if (reportsError) fail("daily_reports table", reportsError.message);
  else ok("daily_reports table");

  // Anon can read branches (public site)
  const { error: anonBranchesError } = await anon.from("branches").select("id").limit(1);
  if (anonBranchesError) fail("anon branches read", anonBranchesError.message);
  else ok("anon can read branches (homepage)");

  // Anon should NOT read inventory (admin-only RLS)
  const { data: anonInv, error: anonInvError } = await anon
    .from("inventory_catalog")
    .select("id")
    .limit(1);
  if (anonInvError || !anonInv?.length) ok("inventory_catalog blocked for anon (expected)");
  else fail("inventory_catalog should not be readable by anon");

  console.log(
    process.exitCode ? "\nSome checks failed." : "\nAll automated checks passed."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
