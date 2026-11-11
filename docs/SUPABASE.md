# Supabase setup

YazNot does not ship its own backend. Each installation uses a Supabase project
owned by its operator. The client only needs the project URL and the
**publishable** (anon) key; row-level security protects the data.

## 1. Tables

Run this SQL in the Supabase SQL editor.

```sql
-- Key/value store used for notes, trash and settings.
create table if not exists public.kv_store (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.kv_store enable row level security;

create policy "kv_store_select_own"
  on public.kv_store for select
  using (auth.uid() = user_id);

create policy "kv_store_insert_own"
  on public.kv_store for insert
  with check (auth.uid() = user_id);

create policy "kv_store_update_own"
  on public.kv_store for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "kv_store_delete_own"
  on public.kv_store for delete
  using (auth.uid() = user_id);

-- Section/group/note sharing between accounts.
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_email text not null,
  content_type text not null,
  content_data jsonb not null,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists shares_receiver_email_idx
  on public.shares (lower(receiver_email));

alter table public.shares enable row level security;

create policy "shares_sender_reads"
  on public.shares for select
  using (auth.uid() = sender_id);

create policy "shares_receiver_reads"
  on public.shares for select
  using (lower(receiver_email) = lower(auth.email()));

create policy "shares_sender_inserts"
  on public.shares for insert
  with check (auth.uid() = sender_id);

create policy "shares_receiver_updates"
  on public.shares for update
  using (lower(receiver_email) = lower(auth.email()))
  with check (lower(receiver_email) = lower(auth.email()));
```

## 2. Authentication

In **Authentication → Providers**:

- Enable **Email** for one-time codes.
- Optionally enable **Google** and add the OAuth client ID/secret.
- In Google Cloud Console, the OAuth client must list this exact **Authorized
  redirect URI**:
  `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
  It is the Supabase callback, not the YazNot domain.

In **Authentication → URL Configuration**:

- **Site URL:** `https://<your-domain>/app/`
- **Redirect URLs:** `https://<your-domain>/**`, `yaznot://auth`, and, for
  local development, `http://localhost:*/**` as needed.

The desktop app opens Google sign-in in an in-app window. By default it returns
to `https://yaznot.vercel.app/app/` and captures the tokens before the page
loads. If you use a different domain, set `oauthRedirect` in `ui/config.js`
and add that exact URL to the redirect list. `yaznot://auth` remains supported
for older builds.

If the return URL is not allow-listed, Supabase falls back to the **Site URL**;
the desktop shell also captures tokens from that URL.

## 3. Client configuration

Copy the example and fill in your values:

```bash
cp ui/config.example.js ui/config.js
```

```js
window.YAZNOT_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY'
};
```

`ui/config.js` is ignored by git. Use only the publishable key. A
`service_role` key bypasses row-level security and must never be placed in a
client application.

## 4. Verify

1. Start the app with `npm run dev`.
2. Sign in with an email code or Google.
3. Create a section and a note, then reload the app; the note should persist.
4. Check the `kv_store` table: one row per account and key.

## Notes

- All note data for an account is stored in a single JSON value under the
  `sections` key. This keeps writes simple and consistent across devices.
- The `shares` table stores shared content as JSON and is read by the receiver's
  email address; both sides are protected by RLS.
- Backups are local JSON files; they are not uploaded automatically.
