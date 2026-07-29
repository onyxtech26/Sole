# SOLE — Sun Tours Travels operations

Bookings, grouping, manifests, messaging, catalogue, team, CRM and finance for a
Rome-based tour operator, backed by a shared Supabase database with realtime
sync between everyone on the team.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # -> dist/
npm run lint     # tsc --noEmit
```

No configuration is needed to start: the app falls back to the SOLE project's
published anon credentials. Copy `.env.example` to `.env.local` to point it
somewhere else.

## What this is

The visual design is the approved handoff in `design/SOLE.dc.html`, with
`design/HANDOFF.md` as its written spec. That prototype ran entirely on
localStorage. This repository is the same design rebuilt as a React app on the
real database — every screen writes to Supabase, and an edit made by one
operator appears on every other signed-in screen within a second.

Keep `design/` as the reference when changing layout: the tokens, spacing and
type scale in `src/index.css` and `src/ui/kit.tsx` are lifted from it verbatim,
and the 33 icons in `src/ui/Icon.tsx` are its exact paths.

## Roles

| Role | Sees | Writes |
|---|---|---|
| `manager` | Everything, including Finance | Everything |
| `operations` | Everything except Finance | Everything except expenses |
| `guide` | Their own portal and their own manifests | Check-ins on bookings assigned to them |

This is enforced by row-level security, not only by the UI. `expenses` is
restricted to `current_app_role() = 'manager'`; the `guide` role is read-only on
reference data, has no access to the CRM, and may only update bookings whose
`assigned_guide` matches their profile's `full_name`.

Money is governed by role alone. `manager` sees revenue on the Dashboard, the
Viator column on Bookings, and the Finance screen; `operations` and `guide` see
none of it. There is no separate finance PIN — every operator signs in as
themselves, so a second shared secret added nothing the role check and RLS did
not already enforce.

### Adding a login

Accounts live in Supabase Auth; operators type a bare username, which is bridged
to `username@sole.app`. Creating one needs the service-role key, which is not in
this repo:

```bash
SUPABASE_SERVICE_KEY=… \
SOLE_NEW_USER=susanna SOLE_NEW_NAME="Susanna" \
SOLE_NEW_ROLE=guide SOLE_NEW_PASSWORD='…' \
npx tsx scripts/create-user.ts
```

For a guide, `SOLE_NEW_NAME` must match their name in **Team → Guides** exactly.
That name is the join key for their portal, their manifests and their row-level
write permission.

## Layout

```
index.html            pre-bundle brand hold, favicon, fonts
src/
  App.tsx             shell: splash, auth, sidebar, header, routing
  index.css           design tokens, responsive rules, keyframes, print
  types.ts            the vocabulary every screen speaks
  ui/                 kit.tsx (primitives, Hov, Modal, toasts), Icon.tsx
  lib/
    config.ts         Supabase URL/key, auth email domain, media bucket
    supabaseClient.ts single browser client
    auth.ts           username -> email bridge, profile -> User
    entities.ts       the ONLY row <-> object translation
    store.ts          localStorage cache + Supabase + realtime, one commit()
    upload.ts         media bucket uploads
  utils/              dates, selectors (derivations), viator, exports, access
  screens/            one file per screen, plus BookingDrawer
design/               the approved handoff: .dc.html, its runtime, the spec
scripts/              smoke.ts (data-layer check), create-user.ts
```

Two rules keep the data layer honest, both in `src/lib/entities.ts`:

1. **Never widen the wire format.** Travellers stay `"Name (Adult)"` strings and
   languages stay full names on the wire, parsed on read and re-encoded on
   write, so the earlier React build reading the same tables keeps working.
2. **Never blank a column we do not own.** Fields the design has no input for
   ride through the app object untouched.

`scripts/smoke.ts` proves both against the live database:

```bash
SOLE_USER=tina SOLE_PASSWORD=… npx tsx scripts/smoke.ts
```

It signs in, reads every mapped table through the real mappers, and fails if a
`fromRow → toRow` round trip would overwrite any existing value. Run it after
touching `entities.ts`.

## Database

Project `jpsyrostafidkneqflui` (`SOLE`, eu-north-1). Tables: `profiles`,
`bookings`, `guides` (guides *and* office staff, split on `role`), `products`,
`customers`, `expenses`, `schedule_groups`, `whatsapp_templates`,
`import_batches`. Files go to the public `sole-media` bucket.

`import_batches` is the shared Viator upload log — one append-only row per
export processed, carrying the file name, size, who uploaded it and the
add/update/unchanged/cancelled/invalid counts. It replaces a `localStorage`
stamp that only ever held the last import and was invisible to teammates.
`imported_by_name` is denormalised so the log still reads correctly after an
operator's account is deleted. Any signed-in user may read and append; only a
manager may delete, via the same `current_app_role()` guard as `expenses`.

Columns added for this build, all nullable with defaults so nothing else
breaks: `bookings.workflow / spent / res_time / traveler_types`,
`whatsapp_templates.stage / when_label`, `guides.job_title`.

## Notes

- `jspdf` and `xlsx` are ~900 kB and load only when an export or import runs.
  Do not add them to `manualChunks` — Rollup would promote them to static
  dependencies and Vite would preload them on every page load.
- `xlsx` comes from SheetJS's own CDN tarball, not npm; the npm build has
  unpatched advisories.
- Deployed on Vercel as a Vite SPA (`vercel.json`).
