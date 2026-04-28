-- ─────────────────────────────────────────────────────────
--  INKWELL — Supabase SQL Schema
--  Run this in your Supabase SQL Editor (Dashboard > SQL)
-- ─────────────────────────────────────────────────────────

-- 1. PROFILES
--    Extends Supabase auth.users with display name and role
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  email         text,
  role          text not null default 'writer',  -- 'writer' | 'admin'
  bio           text,
  created_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. STORIES
create table if not exists public.stories (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  synopsis      text,
  genre         text,
  file_url      text,
  status        text not null default 'pending_review',
  --             'pending_review' | 'approved' | 'rejected'
  review_note   text,           -- feedback from admin on rejection
  reviewed_by   uuid references public.profiles(id),
  submitted_at  timestamptz default now(),
  approved_at   timestamptz,
  views         integer default 0,
  likes         integer default 0
);

-- 3. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.stories  enable row level security;

-- Profiles: users can read all, update only their own
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Stories: public can only see approved
create policy "stories_select_approved" on public.stories
  for select using (status = 'approved');

-- Writers can see their own (all statuses)
create policy "stories_select_own" on public.stories
  for select using (auth.uid() = author_id);

-- Writers can insert their own stories (status forced to pending_review via backend)
create policy "stories_insert_own" on public.stories
  for insert with check (auth.uid() = author_id);

-- Only admins can update status (approved/rejected)
-- NOTE: admin updates go through service-role key on backend, bypassing RLS
-- The policy below is an extra frontend guard:
create policy "stories_update_admin" on public.stories
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. STORAGE BUCKET
--    Create a bucket called "story-uploads" in Supabase Dashboard > Storage
--    Then run:
insert into storage.buckets (id, name, public)
values ('story-uploads', 'story-uploads', false)
on conflict do nothing;

-- Only authenticated users can upload to their own folder
create policy "storage_writer_upload" on storage.objects
  for insert with check (
    bucket_id = 'story-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins and story owners can read
create policy "storage_read_own" on storage.objects
  for select using (
    bucket_id = 'story-uploads'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );
