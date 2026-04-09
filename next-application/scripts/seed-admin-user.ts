/**
 * One-off: create admin@noemail.com for local/dev. Requires SUPABASE_SERVICE_ROLE_KEY.
 * Do not run against production without rotating the password.
 *
 * Usage (from nexsev/): `npm run seed:admin`
 */
import { createClient } from "@supabase/supabase-js";

const email = "admin@noemail.com";
const password = "admin";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    console.error("listUsers failed:", listErr.message);
    process.exit(1);
  }

  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
  if (existing) {
    console.log(`User ${email} already exists (id ${existing.id}). Skipping create.`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }

  console.log(`Created ${email} (id ${data.user?.id}). Password is "${password}" — dev/local only.`);
}

void main();
