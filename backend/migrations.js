// backend/migrations.js
// ─────────────────────────────────────────────────────────
//  Helper to create tables if they don't exist.
//  Run once: node backend/migrations.js
// ─────────────────────────────────────────────────────────

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function runMigrations() {
  console.log('🔄 Running migrations...');

  const sql = `
    -- Profiles (extends auth.users)
    create table if not exists public.profiles (
      id            uuid primary key references auth.users(id) on delete cascade,
      display_name  text,
      email         text,
      role          text not null default 'writer',
      bio           text,
      created_at    timestamptz default now()
    );

    -- Stories
    create table if not exists public.stories (
      id            uuid primary key default gen_random_uuid(),
      author_id     uuid not null references public.profiles(id) on delete cascade,
      title         text not null,
      synopsis      text,
      genre         text,
      file_url      text,
      status        text not null default 'pending_review',
      review_note   text,
      reviewed_by   uuid references public.profiles(id),
      submitted_at  timestamptz default now(),
      approved_at   timestamptz,
      views         integer default 0,
      likes         integer default 0
    );

    -- Enable RLS
    alter table public.profiles enable row level security;
    alter table public.stories enable row level security;

    -- RLS: Profiles
    create policy "profiles_select_all" on public.profiles
      for select using (true);
    create policy "profiles_update_own" on public.profiles
      for update using (auth.uid() = id);

    -- RLS: Stories (public can only see approved)
    create policy "stories_select_approved" on public.stories
      for select using (status = 'approved');
    create policy "stories_select_own" on public.stories
      for select using (auth.uid() = author_id);
    create policy "stories_insert_own" on public.stories
      for insert with check (auth.uid() = author_id);
    create policy "stories_update_admin" on public.stories
      for update using (
        exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        )
      );
  `;

  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    // exec_sql doesn't exist in standard Supabase, so we'll note this
    console.log('⚠️  Migrations must be run manually via Supabase SQL Editor.');
    console.log('📝 Copy the SQL from backend/schema.sql and run it in:');
    console.log('   Dashboard → SQL Editor → New Query → Paste → Run');
  } else {
    console.log('✓ Migrations complete');
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
