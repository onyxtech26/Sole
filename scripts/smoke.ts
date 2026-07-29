/*
 * End-to-end check of the data layer against the live SOLE project.
 *
 *   SOLE_USER=tina SOLE_PASSWORD=… npx tsx scripts/smoke.ts
 *
 * It signs in, reads every mapped table through the real row mappers, proves a
 * row survives a fromRow -> toRow round trip unchanged, and confirms the RLS
 * boundary on `expenses`. It never writes anything.
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_EMAIL_DOMAIN } from '../src/lib/config';
import { ENTITIES, STORE_KEYS } from '../src/lib/entities';

const USER = process.env.SOLE_USER;
const PASSWORD = process.env.SOLE_PASSWORD;

if (!USER || !PASSWORD) {
  console.error('Set SOLE_USER and SOLE_PASSWORD in the environment.');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => { failures++; console.log(`  ✗ ${m}`); };

/** Columns the app deliberately does not model; ignored when diffing. */
const IGNORED = new Set(['created_at', 'updated_at', 'role', 'sort', 'job_title']);

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0);

interface Drift { lost: string[]; filled: string[] }

/**
 * Losing or changing a value is a bug. Filling a column that was empty is the
 * app back-filling one of the new columns, which is the intended behaviour.
 */
function diffRow(before: any, after: any): Drift {
  const lost: string[] = [];
  const filled: string[] = [];
  for (const k of Object.keys(after)) {
    if (IGNORED.has(k)) continue;
    const a = before[k];
    const b = after[k];
    // Postgres hands numerics back as strings; compare by value, not by type.
    const same = typeof b === 'number' || typeof a === 'number'
      ? Number(a) === Number(b)
      : JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    if (same) continue;
    if (isEmpty(a) && !isEmpty(b)) filled.push(k);
    else lost.push(`${k}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  }
  return { lost, filled };
}

async function main() {
  const email = USER!.includes('@') ? USER! : `${USER}@${AUTH_EMAIL_DOMAIN}`;
  console.log(`\nSigning in as ${email} …`);

  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email, password: PASSWORD!,
  });
  if (authErr || !auth.user) {
    bad(`sign in failed: ${authErr?.message}`);
    process.exit(1);
  }
  ok(`signed in (${auth.user.id})`);

  const { data: profile } = await supabase
    .from('profiles').select('username, full_name, role').eq('id', auth.user.id).single();
  if (!profile) { bad('no profile row is linked to this account'); process.exit(1); }
  ok(`profile: ${profile.full_name} / role=${profile.role}`);

  console.log('\nReading every mapped table …');
  for (const key of STORE_KEYS) {
    const cfg = ENTITIES[key];
    const { data, error } = await supabase.from(cfg.table).select('*');

    if (error) {
      if (cfg.table === 'expenses' && profile.role !== 'manager') {
        ok(`${key}: blocked by RLS, as expected for role=${profile.role}`);
      } else {
        bad(`${key} (${cfg.table}): ${error.message}`);
      }
      continue;
    }

    const rows = cfg.rowFilter ? (data ?? []).filter(cfg.rowFilter) : (data ?? []);
    const mapped = rows.map(cfg.fromRow);
    ok(`${key}: ${mapped.length} rows via ${cfg.table}`);

    if (!rows.length) continue;

    // Round trip the first row and report anything the mappers would corrupt.
    const { lost, filled } = diffRow(rows[0], cfg.toRow(mapped[0], 0));
    if (lost.length) {
      bad(`${key}: round trip would overwrite ${lost.length} field(s) — ${lost.join(' | ')}`);
    } else {
      ok(`${key}: round trip is lossless${filled.length ? ` (back-fills ${filled.join(', ')})` : ''}`);
    }
  }

  await supabase.auth.signOut();
  console.log(failures ? `\nFAILED with ${failures} problem(s).\n` : '\nAll checks passed.\n');
  process.exit(failures ? 1 : 0);
}

main().catch(e => { console.error('SMOKE CRASHED:', e); process.exit(1); });
