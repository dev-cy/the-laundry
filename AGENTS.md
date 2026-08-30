<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase

After changing `supabase/schema.sql` or adding files under `supabase/migrations/`, apply SQL manually:

1. Supabase Dashboard → **SQL Editor**
2. Run each new file in `supabase/migrations/` **in filename order** (oldest first)
3. Do not re-run a migration that was already applied
