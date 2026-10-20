-- ============================================================
-- Vibe2Verse — Initial Database Schema
-- Apply via: Supabase SQL Editor or `supabase db push`
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Updated-at trigger helper ─────────────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Enums ─────────────────────────────────────────────────────
create type song_status as enum (
  'pending',
  'generating_lyrics',
  'generating_music',
  'processing_audio',
  'completed',
  'failed',
  'cancelled'
);

create type rap_style as enum (
  'funny_comedy',
  'friendly_roast',
  'desi_hiphop',
  'trap',
  'old_school',
  'chill',
  'energetic_party'
);

create type mood as enum (
  'funny',
  'confident',
  'energetic',
  'chill',
  'dramatic',
  'affectionate',
  'motivational',
  'celebratory'
);

create type roast_level as enum (
  'clean',
  'mild',
  'spicy'
);

create type job_type as enum (
  'generate_lyrics',
  'generate_music',
  'poll_provider',
  'process_audio',
  'cleanup'
);

create type job_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

-- ── profiles ──────────────────────────────────────────────────
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure handle_updated_at();

-- ── songs ─────────────────────────────────────────────────────
create table songs (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid references auth.users(id) on delete set null,
  -- Input fields
  title                     text,
  description               text,
  personality_input         text not null,
  character_name            text,
  language                  text not null default 'english',
  rap_style                 rap_style not null default 'funny_comedy',
  mood                      mood not null default 'funny',
  roast_level               roast_level not null default 'mild',
  requested_duration_seconds integer not null default 60 check (requested_duration_seconds between 30 and 180),
  -- Generation state
  status                    song_status not null default 'pending',
  progress                  integer not null default 0 check (progress between 0 and 100),
  -- Provider tracking
  provider                  text,
  provider_job_id           text,
  -- Output
  audio_path                text,                -- Supabase Storage path (not signed URL)
  audio_duration_seconds    numeric(6,2),
  cover_image_path          text,
  -- Error tracking
  error_code                text,
  error_message             text,
  -- Timestamps
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  completed_at              timestamptz
);

create index songs_user_id_idx on songs(user_id);
create index songs_status_idx on songs(status);
create index songs_created_at_idx on songs(created_at desc);
create index songs_provider_job_id_idx on songs(provider_job_id) where provider_job_id is not null;

create trigger songs_updated_at
  before update on songs
  for each row execute procedure handle_updated_at();

-- ── song_lyrics ───────────────────────────────────────────────
create table song_lyrics (
  id             uuid primary key default uuid_generate_v4(),
  song_id        uuid not null references songs(id) on delete cascade,
  version        integer not null default 1,
  lyrics_json    jsonb not null,
  plain_text     text not null,
  model_provider text not null,
  created_at     timestamptz not null default now(),
  unique(song_id, version)
);

create index song_lyrics_song_id_idx on song_lyrics(song_id);

-- ── generation_jobs ───────────────────────────────────────────
create table generation_jobs (
  id              uuid primary key default uuid_generate_v4(),
  song_id         uuid not null references songs(id) on delete cascade,
  job_type        job_type not null,
  status          job_status not null default 'pending',
  attempt_count   integer not null default 0,
  provider_job_id text,
  last_error_code text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index generation_jobs_song_id_idx on generation_jobs(song_id);
create index generation_jobs_status_idx on generation_jobs(status) where status in ('pending', 'running');

create trigger generation_jobs_updated_at
  before update on generation_jobs
  for each row execute procedure handle_updated_at();

-- ── song_events ───────────────────────────────────────────────
create table song_events (
  id         uuid primary key default uuid_generate_v4(),
  song_id    uuid not null references songs(id) on delete cascade,
  event_type text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index song_events_song_id_idx on song_events(song_id);

-- ── generation_outbox (outbox pattern for reliable publishing) ─
create table generation_outbox (
  id           uuid primary key default uuid_generate_v4(),
  song_id      uuid not null references songs(id) on delete cascade,
  event_type   text not null,
  payload      jsonb not null,
  published    boolean not null default false,
  attempts     integer not null default 0,
  created_at   timestamptz not null default now(),
  published_at timestamptz
);

create index generation_outbox_unpublished_idx on generation_outbox(created_at) where published = false;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table songs enable row level security;
alter table song_lyrics enable row level security;
alter table generation_jobs enable row level security;
alter table song_events enable row level security;
alter table generation_outbox enable row level security;

-- profiles
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Profile created on signup"
  on profiles for insert with check (auth.uid() = id);

-- songs
create policy "Users can view own songs"
  on songs for select using (auth.uid() = user_id);

create policy "Users can insert own songs"
  on songs for insert with check (auth.uid() = user_id);

create policy "Users can update own songs"
  on songs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own songs"
  on songs for delete using (auth.uid() = user_id);

-- Allow anonymous song creation (guest mode — song linked to null user_id)
-- Guests can only see their own song via explicit song ID lookup (not the list)
create policy "Anonymous users can insert songs without user_id"
  on songs for insert with check (user_id is null);

-- song_lyrics
create policy "Users can view own song lyrics"
  on song_lyrics for select
  using (exists (
    select 1 from songs where songs.id = song_lyrics.song_id
      and (songs.user_id = auth.uid() or songs.user_id is null)
  ));

-- generation_jobs (read-only for users, write via service role only)
create policy "Users can view own generation jobs"
  on generation_jobs for select
  using (exists (
    select 1 from songs where songs.id = generation_jobs.song_id
      and songs.user_id = auth.uid()
  ));

-- song_events
create policy "Users can view own song events"
  on song_events for select
  using (exists (
    select 1 from songs where songs.id = song_events.song_id
      and songs.user_id = auth.uid()
  ));

-- generation_outbox: service role only — no user policies needed
-- (Accessed only by server-side workers using service role key)

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Storage Buckets
-- (Run these in Supabase Dashboard > Storage, or via CLI)
-- ============================================================
-- NOTE: Execute the storage policies via Supabase Dashboard SQL Editor
-- after creating the bucket, OR use Supabase CLI storage commands.

-- Create audio bucket (private)
insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

-- Create covers bucket (can be public for previews)
insert into storage.buckets (id, name, public)
values ('covers', 'covers', false)
on conflict (id) do nothing;

-- Storage RLS: users can only access their own audio
create policy "Users can upload own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'audio' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own audio"
  on storage.objects for select
  using (
    bucket_id = 'audio' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own audio"
  on storage.objects for delete
  using (
    bucket_id = 'audio' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Service role can manage all audio"
  on storage.objects for all
  using (bucket_id in ('audio', 'covers'));

-- ============================================================
-- Verification queries (run after applying migration)
-- ============================================================
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select * from profiles limit 5;
-- select * from songs limit 5;
