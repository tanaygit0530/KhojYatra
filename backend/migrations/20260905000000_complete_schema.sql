-- ============================================================================
-- KhojYatra Phase 3 — Complete Database Schema & Row-Level Security
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- Custom Enums
create type user_role as enum ('traveler', 'provider', 'admin');

create type experience_category as enum (
  'food_culinary',
  'cultural_heritage',
  'festivals_events',
  'workshops_classes',
  'adventure_outdoor',
  'hidden_gems',
  'shopping_markets',
  'nightlife_entertainment'
);

create type verification_status as enum ('pending', 'verified');
create type offering_status as enum ('draft', 'published', 'paused');
create type itinerary_visibility as enum ('public', 'anonymous', 'private');
create type ingestion_status as enum ('pending_review', 'approved', 'rejected');

-- 1. Users table (linked to auth.users if Supabase Auth is enabled)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role user_role not null default 'traveler',
  name text,
  email text unique,
  created_at timestamptz default now()
);

-- 2. Traveler Profiles
create table if not exists traveler_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  interests text[] default '{}',
  budget_band text,
  traveler_type text,
  accessibility_tags text[] default '{}'
);

-- 3. Providers
create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  verification_status verification_status default 'pending',
  locally_operated boolean default false,
  community_vouch_count int default 0,
  trust_score int default 40
);

-- 4. Experiences
create table if not exists experiences (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references providers(id) on delete set null,
  title text not null,
  description text,
  category experience_category not null,
  price_min numeric not null default 0,
  price_max numeric not null default 0,
  duration_min int not null default 60,
  lat float8 not null,
  lng float8 not null,
  accessibility_tags text[] default '{}',
  interest_tags text[] default '{}',
  rating_avg numeric default 0,
  locality_score int default 50,
  offering_status offering_status default 'draft',
  photo_urls text[] default '{}',
  created_at timestamptz default now()
);

-- 5. Availability Slots
create table if not exists availability_slots (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references experiences(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  capacity_remaining int not null default 10
);

-- 6. Sessions (supports anonymous sessions)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  constraint_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 7. Group Sessions
create table if not exists group_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists group_members (
  group_session_id uuid references group_sessions(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  primary key (group_session_id, session_id)
);

create table if not exists group_votes (
  id uuid primary key default gen_random_uuid(),
  group_session_id uuid references group_sessions(id) on delete cascade,
  user_id uuid,
  experience_id uuid references experiences(id) on delete cascade,
  vote boolean not null
);

-- 8. Itineraries
create table if not exists itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  date date not null default current_date,
  status text default 'draft',
  budget_cap numeric,
  group_session_id uuid references group_sessions(id) on delete set null,
  created_at timestamptz default now()
);

-- 9. Itinerary Items
create table if not exists itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references itineraries(id) on delete cascade,
  experience_id uuid references experiences(id) on delete cascade,
  position int not null default 0,
  start_time timestamptz,
  price_committed numeric not null default 0
);

-- 10. Reviews
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references experiences(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  rating int check (rating >= 1 and rating <= 5),
  text text,
  created_at timestamptz default now()
);

-- 11. Reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid,
  target_id uuid not null,
  type text not null,
  status text default 'open',
  created_at timestamptz default now()
);

-- 12. Recommendation Events
create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid references sessions(id) on delete set null,
  experience_id uuid references experiences(id) on delete cascade,
  score numeric,
  reasons_json jsonb default '[]'::jsonb,
  source text default 'ai',
  timestamp timestamptz default now()
);

-- 13. Community Itineraries
create table if not exists community_itineraries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id) on delete set null,
  title text not null,
  destination text not null,
  duration_days int default 1,
  budget numeric default 0,
  group_type text default 'solo',
  interests text[] default '{}',
  travel_style text,
  visibility itinerary_visibility default 'private',
  created_at timestamptz default now()
);

create table if not exists community_itinerary_items (
  id uuid primary key default gen_random_uuid(),
  community_itinerary_id uuid references community_itineraries(id) on delete cascade,
  experience_id uuid references experiences(id) on delete cascade,
  day_number int default 1,
  position int default 0,
  notes text
);

-- 14. Search Logs
create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid references sessions(id) on delete set null,
  constraint_json jsonb,
  lat float8,
  lng float8,
  timestamp timestamptz default now()
);

-- 15. WhatsApp Voice Logs
create table if not exists whatsapp_voice_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references providers(id) on delete cascade,
  transcript text,
  extracted_json jsonb,
  status text default 'processing',
  processed_at timestamptz
);

-- 16. Social Ingestion Staging
create table if not exists social_ingestion_staging (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  extracted_experience_json jsonb not null,
  trust_label text default 'social_signal_unverified',
  status ingestion_status default 'pending_review',
  reviewed_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

-- 17. Safety Check-ins
create table if not exists safety_checkins (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references itineraries(id) on delete cascade,
  share_token text unique not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- ============================================================================
-- Row-Level Security (RLS)
-- ============================================================================
alter table traveler_profiles enable row level security;
alter table sessions enable row level security;
alter table itineraries enable row level security;
alter table itinerary_items enable row level security;
alter table experiences enable row level security;
alter table availability_slots enable row level security;
alter table whatsapp_voice_logs enable row level security;
alter table community_itineraries enable row level security;
alter table social_ingestion_staging enable row level security;

-- Public read for published experiences
create policy "Public can view published experiences"
  on experiences for select
  using (offering_status = 'published');

-- Providers can manage their own experiences
create policy "Providers can manage own experiences"
  on experiences for all
  using (
    provider_id in (
      select id from providers where user_id = auth.uid()
    )
  );

-- Availability slots read policy
create policy "Public can view availability slots of published experiences"
  on availability_slots for select
  using (
    experience_id in (
      select id from experiences where offering_status = 'published'
    )
  );

-- Travelers can view and manage their own itineraries
create policy "Users can manage their own itineraries"
  on itineraries for all
  using (user_id = auth.uid());

create policy "Users can manage their own itinerary items"
  on itinerary_items for all
  using (
    itinerary_id in (
      select id from itineraries where user_id = auth.uid()
    )
  );

-- Community Itineraries: Public or Anonymous visibility
create policy "Public can view non-private community itineraries"
  on community_itineraries for select
  using (visibility in ('public', 'anonymous'));

create policy "Owners can manage their community itineraries"
  on community_itineraries for all
  using (owner_user_id = auth.uid());
