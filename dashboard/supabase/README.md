# Setting up the Sole database on any Supabase account

Two SQL files, run in order. Works on any account you can log into — your own or the client's. Takes about two minutes.

## Steps

1. **Log into Supabase** with the account you want to host the database.
2. **New project** → name it `sole-reservations`, region **South Asia (Mumbai)**, and **set a database password you'll remember** (you'll need it in step 6).
3. Wait for the project to finish provisioning (~1 min).
4. Open the **SQL Editor** (left sidebar → the `>_` icon).
5. Run the two files **in order**:
   - Paste all of [`01_schema.sql`](./01_schema.sql) → **Run**. Creates the 8 tables.
   - Paste all of [`02_seed.sql`](./02_seed.sql) → **Run**. Loads the demo day (12 Jul 2026): 6 bookings, 29 travellers, the real group split.
6. **Get the connection string:** Project Settings → **Database** → **Connection string** → **Transaction pooler** (port 6543). It looks like:
   ```
   postgresql://postgres.<ref>:<YOUR-DB-PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
   Swap `<YOUR-DB-PASSWORD>` for the password from step 2.

## Verify it worked

In the SQL Editor, run:
```sql
SELECT
 (SELECT count(*) FROM travellers) travellers,
 (SELECT count(*) FROM travellers WHERE group_id=1) group1,
 (SELECT count(*) FROM travellers WHERE group_id=2) group2,
 (SELECT count(*) FROM travellers WHERE group_id IS NULL) unassigned;
```
You should see **travellers 29 · group1 6 · group2 7 · unassigned 16**. That's the real Sun Tours split — one 8-person booking split 6/2 across two groups, and Group 2 holding 7 from three bookings.

## Then

Put the connection string into:
- **`dashboard/.env`** as `DATABASE_URL=...` (local — gitignored, never committed)
- **Vercel** → Project → Settings → Environment Variables → `DATABASE_URL` (production)

Also set `JWT_SECRET` in both to any random 32+ character string.

Login for the app: **admin@sole.demo** / **demo123**
