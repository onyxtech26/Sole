/* Integration smoke test against the live project using the ANON key —
 * exercises exactly what the browser app does: auth, RLS role enforcement,
 * and read/write flows. Run: SUPABASE_URL=.. SUPABASE_ANON_KEY=.. npx tsx scripts/smoke.ts */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;

function client() {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function login(email: string, password: string) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  const { data: prof } = await c.from('profiles').select('username, role, full_name').eq('id', data.user.id).single();
  return { c, profile: prof };
}

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

async function main() {
  console.log('— Tina (operations): should see ops data but NOT finance —');
  {
    const { c, profile } = await login('tina@sole.app', 'Tina@sole2026');
    check('tina profile role = operations', profile?.role === 'operations', `got ${profile?.role}`);
    const bookings = await c.from('bookings').select('booking_ref', { count: 'exact' });
    check('tina can read bookings', !bookings.error && (bookings.count ?? 0) > 0, `count=${bookings.count} err=${bookings.error?.message}`);
    const guides = await c.from('guides').select('id');
    check('tina can read guides', !guides.error && (guides.data?.length ?? 0) > 0);
    const products = await c.from('products').select('code');
    check('tina can read products', !products.error && (products.data?.length ?? 0) > 0);
    const expenses = await c.from('expenses').select('id');
    check('tina BLOCKED from expenses (RLS → 0 rows)', (expenses.data?.length ?? 0) === 0, `count=${expenses.data?.length}`);
    const insExp = await c.from('expenses').insert({ id: 'EXP-SMOKE', category: 'Other', amount: 1, date: '2026-08-01', description: 'x', status: 'Approved' });
    check('tina CANNOT insert expense (RLS)', !!insExp.error, `unexpectedly succeeded`);
    await c.auth.signOut();
  }

  console.log('\n— Sina (manager): full access incl. finance —');
  {
    const { c, profile } = await login('sina@sole.app', 'Sina@sole2026');
    check('sina profile role = manager', profile?.role === 'manager', `got ${profile?.role}`);
    const expenses = await c.from('expenses').select('id');
    check('sina can read expenses', !expenses.error && (expenses.data?.length ?? 0) > 0, `count=${expenses.data?.length}`);

    // write flow: upsert a test booking, then delete it
    const ref = 'BR-SMOKE-0001';
    const up = await c.from('bookings').upsert({
      booking_ref: ref, tour_name: 'Smoke Tour', product_code: '5524558P1', travel_date: '2026-08-15',
      tour_time: '09:00', lead_traveler: 'Smoke Test', travelers: ['Smoke Test (Adult)'],
      pax_adults: 1, pax_children: 0, status: 'Confirmed', payment_status: 'Paid', amount: 10, currency: 'EUR',
    }, { onConflict: 'booking_ref' });
    check('sina can upsert a booking', !up.error, up.error?.message);
    const del = await c.from('bookings').delete().eq('booking_ref', ref);
    check('sina can delete a booking', !del.error, del.error?.message);
    await c.auth.signOut();
  }

  console.log('\n— Anonymous (no session): RLS should block reads —');
  {
    const c = client();
    const bookings = await c.from('bookings').select('booking_ref');
    check('anon blocked from bookings (0 rows)', (bookings.data?.length ?? 0) === 0);
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch(e => { console.error('SMOKE ERROR:', e.message); process.exit(1); });
