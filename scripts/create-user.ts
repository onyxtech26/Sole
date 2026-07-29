/*
 * Create (or update) a SOLE login.
 *
 * Needs the project's service-role key, which is deliberately NOT stored in
 * this repo — pass it in the environment for the one command:
 *
 *   SUPABASE_SERVICE_KEY=… \
 *   SOLE_NEW_USER=susanna \
 *   SOLE_NEW_NAME="Susanna" \
 *   SOLE_NEW_ROLE=guide \
 *   SOLE_NEW_PASSWORD='pick-a-strong-one' \
 *   npx tsx scripts/create-user.ts
 *
 * Roles: manager | operations | guide
 *
 * For role=guide, SOLE_NEW_NAME must match the guide's name in the Team
 * directory exactly — that name is what links their portal, their manifests and
 * their row-level permission to the bookings assigned to them.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, AUTH_EMAIL_DOMAIN } from '../src/lib/config';

const SERVICE = process.env.SUPABASE_SERVICE_KEY;
const username = process.env.SOLE_NEW_USER?.trim().toLowerCase();
const fullName = process.env.SOLE_NEW_NAME?.trim();
const role = process.env.SOLE_NEW_ROLE?.trim();
const password = process.env.SOLE_NEW_PASSWORD;

const ROLES = ['manager', 'operations', 'guide'];

if (!SERVICE) { console.error('Missing SUPABASE_SERVICE_KEY.'); process.exit(2); }
if (!username || !fullName || !password) {
  console.error('Missing SOLE_NEW_USER / SOLE_NEW_NAME / SOLE_NEW_PASSWORD.');
  process.exit(2);
}
if (!role || !ROLES.includes(role)) {
  console.error(`SOLE_NEW_ROLE must be one of: ${ROLES.join(', ')}`);
  process.exit(2);
}
if (password.length < 10) {
  console.error('Use a password of at least 10 characters.');
  process.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = username.includes('@') ? username : `${username}@${AUTH_EMAIL_DOMAIN}`;

async function main() {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);

  let id = list.users.find(u => u.email === email)?.id;

  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) throw new Error(`updateUser: ${error.message}`);
    console.log(`✓ ${email} already existed — password reset`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, full_name: fullName },
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    id = data.user.id;
    console.log(`✓ created ${email}`);
  }

  const { error: pErr } = await admin
    .from('profiles')
    .upsert({ id, username, full_name: fullName, role }, { onConflict: 'id' });
  if (pErr) throw new Error(`profile: ${pErr.message}`);
  console.log(`✓ profile: ${fullName} / role=${role}`);

  if (role === 'guide') {
    const { data: match } = await admin
      .from('guides').select('id').eq('name', fullName).limit(1).maybeSingle();
    if (match) {
      console.log(`✓ linked to guide ${match.id} in the Team directory`);
    } else {
      console.log(
        `! No guide named "${fullName}" is in the Team directory yet.\n` +
        '  Add them under Team → New guide with exactly this name, or their portal\n' +
        '  and manifests will come up empty.',
      );
    }
  }

  console.log(`\nThey can now sign in with the username "${username}".\n`);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
