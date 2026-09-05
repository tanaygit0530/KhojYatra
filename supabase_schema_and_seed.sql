-- ============================================================================
-- KhojYatra — Complete Supabase Database Schema & Seed Data
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase project dashboard (https://supabase.com/dashboard)
-- 2. Go to "SQL Editor" -> "New query"
-- 3. Paste this entire query and click "Run" (or Cmd + Enter)
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- Custom Enums
do $$ begin
  create type user_role as enum ('traveler', 'provider', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
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
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('pending', 'verified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offering_status as enum ('draft', 'published', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type itinerary_visibility as enum ('public', 'anonymous', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ingestion_status as enum ('pending_review', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- 1. Users table (synced with Supabase Auth users)
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
  provider_name text,
  provider_verified boolean default false,
  provider_trust_score int default 50,
  badge_label text,
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

-- 6. Sessions (supports anonymous session tracking)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  constraint_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 7. Group Sessions
create table if not exists group_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text default 'Trip Squad',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists group_members (
  group_session_id uuid references group_sessions(id) on delete cascade,
  session_id text not null,
  member_name text default 'Traveler',
  primary key (group_session_id, session_id)
);

create table if not exists group_votes (
  id uuid primary key default gen_random_uuid(),
  group_session_id uuid references group_sessions(id) on delete cascade,
  session_id text not null,
  experience_id uuid references experiences(id) on delete cascade,
  vote int not null default 1,
  created_at timestamptz default now()
);

-- 8. Itineraries
create table if not exists itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_id text,
  date date not null default current_date,
  status text default 'draft',
  budget_cap numeric default 3000,
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
  user_name text default 'Traveler',
  rating int check (rating >= 1 and rating <= 5),
  text text,
  created_at timestamptz default now()
);

-- 11. Reports (Fraud / Inaccurate listing reports)
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references experiences(id) on delete cascade,
  reporter_session_id text,
  reason text not null,
  details text,
  status text default 'pending',
  resolution_action text,
  created_at timestamptz default now()
);

-- 12. Recommendation Events (for analytics)
create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id text,
  experience_id uuid references experiences(id) on delete cascade,
  score numeric,
  reasons_json jsonb default '[]'::jsonb,
  source text default 'ai',
  timestamp timestamptz default now()
);

-- 13. Community Itineraries ("Travelers Like You")
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
  visibility itinerary_visibility default 'public',
  items_json jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 14. Search Logs (Demand Heatmap)
create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id text,
  constraint_json jsonb,
  lat float8 not null,
  lng float8 not null,
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

-- 17. Safety Check-ins (Public live route sharing)
create table if not exists safety_checkins (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references itineraries(id) on delete cascade,
  share_token text unique not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- 18. Bookings (Mock Reservation & Checkout)
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id text unique not null,
  experience_id uuid references experiences(id) on delete cascade,
  slot_id uuid references availability_slots(id) on delete set null,
  session_id text,
  traveler_name text not null default 'Traveler',
  party_size int not null default 1,
  total_amount numeric not null default 0,
  payment_method text not null default 'upi',
  status text not null default 'confirmed',
  created_at timestamptz default now()
);

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================
alter table experiences enable row level security;
alter table availability_slots enable row level security;
alter table community_itineraries enable row level security;
alter table safety_checkins enable row level security;
alter table bookings enable row level security;
alter table providers enable row level security;

-- Clean drop & recreate policies for idempotency
drop policy if exists "Public can view published experiences" on experiences;
create policy "Public can view published experiences"
  on experiences for select
  using (offering_status = 'published');

drop policy if exists "Public can view availability slots of published experiences" on availability_slots;
create policy "Public can view availability slots of published experiences"
  on availability_slots for select
  using (
    experience_id in (
      select id from experiences where offering_status = 'published'
    )
  );

drop policy if exists "Public can view non-private community itineraries" on community_itineraries;
create policy "Public can view non-private community itineraries"
  on community_itineraries for select
  using (visibility in ('public', 'anonymous'));

drop policy if exists "Public can view safety checkins by token" on safety_checkins;
create policy "Public can view safety checkins by token"
  on safety_checkins for select
  using (expires_at > now());

drop policy if exists "Public can view providers" on providers;
create policy "Public can view providers"
  on providers for select
  using (true);

drop policy if exists "Public can view and insert bookings" on bookings;
create policy "Public can view and insert bookings"
  on bookings for all
  using (true);

-- ============================================================================
-- SEED DATA (Valid Hexadecimal UUIDs: digits 0-9 and a-f only)
-- ============================================================================

-- Providers
insert into providers (id, name, verification_status, locally_operated, community_vouch_count, trust_score)
values
  ('a1111111-1111-4111-8111-111111111111', 'Dilli Khana & Heritage Guild', 'verified', true, 24, 92),
  ('a2222222-2222-4222-8222-222222222222', 'Jaipur Craft & Clay Collective', 'pending', true, 7, 68),
  ('a3333333-3333-4333-8333-333333333333', 'Ganga Living Culture Guild', 'verified', true, 31, 96)
on conflict (id) do update set
  name = excluded.name,
  verification_status = excluded.verification_status,
  locally_operated = excluded.locally_operated,
  community_vouch_count = excluded.community_vouch_count,
  trust_score = excluded.trust_score;

-- Experiences across all 8 categories
insert into experiences (
  id, provider_id, title, description, category, price_min, price_max, duration_min,
  lat, lng, accessibility_tags, interest_tags, rating_avg, locality_score, offering_status, photo_urls,
  provider_name, provider_verified, provider_trust_score
)
values
  (
    'e1111111-1111-4111-8111-111111111111',
    'a1111111-1111-4111-8111-111111111111',
    'Old Delhi Midnight Kebab & Paratha Trail',
    'Walk through narrow alleyways of Chandni Chowk sampling 6 legendary family recipes made over charcoal since 1912.',
    'food_culinary', 500, 850, 120,
    28.6506, 77.2303,
    array['step_free'],
    array['street_food', 'heritage', 'night_walk', 'local_guide'],
    4.9, 98, 'published',
    array['https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80'],
    'Dilli Khana & Heritage Guild', true, 92
  ),
  (
    'e2222222-2222-4222-8222-222222222222',
    'a3333333-3333-4333-8333-333333333333',
    'Varanasi Subah-e-Banaras Boat & Vedic Chants',
    'Witness sunrise boat rituals along Dashashwamedh Ghat with Vedic flute acoustics and sacred morning ceremonies.',
    'cultural_heritage', 700, 1200, 150,
    25.3076, 83.0107,
    array['visual_aid'],
    array['spirituality', 'boat_ride', 'sunrise', 'ancient_history'],
    4.95, 99, 'published',
    array['https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=600&auto=format&fit=crop&q=80'],
    'Ganga Living Culture Guild', true, 96
  ),
  (
    'e3333333-3333-4333-8333-333333333333',
    'a2222222-2222-4222-8222-222222222222',
    'Pushkar Desert Folk Fire & Music Gathering',
    'Campfire acoustic storytelling and Kalbelia folk performance under star-filled dunes with traditional chai.',
    'festivals_events', 900, 1600, 180,
    26.4883, 74.5511,
    array['wheelchair_accessible'],
    array['folk_music', 'campfire', 'desert', 'performance'],
    4.8, 91, 'published',
    array['https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80'],
    'Jaipur Craft & Clay Collective', false, 68
  ),
  (
    'e4444444-4444-4444-8444-444444444444',
    'a2222222-2222-4222-8222-222222222222',
    'Jaipur Master Artisan Cobalt Blue Pottery',
    'Hands-on potter wheel training shaping natural quartz clay, with traditional cobalt oxide motifs firing techniques.',
    'workshops_classes', 1100, 1800, 120,
    26.9124, 75.7873,
    array['step_free'],
    array['pottery', 'crafts', 'hands_on', 'art'],
    4.85, 95, 'published',
    array['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80'],
    'Jaipur Craft & Clay Collective', false, 68
  ),
  (
    'e5555555-5555-4555-8555-555555555555',
    'a3333333-3333-4333-8333-333333333333',
    'Rishikesh Secret Pine Valley & Sacred Cave Trek',
    'Trek upstream along a hidden tributary to the sage Vashistha cave through untouched deodar forests.',
    'adventure_outdoor', 800, 1400, 240,
    30.0869, 78.2676,
    array[]::text[],
    array['trekking', 'nature', 'himalayas', 'cave'],
    4.75, 89, 'published',
    array['https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80'],
    'Ganga Living Culture Guild', true, 96
  ),
  (
    'e6666666-6666-4666-8666-666666666666',
    'a1111111-1111-4111-8111-111111111111',
    'Agrasen ki Baori Secret Acoustic Echo Chamber',
    'Explore subterranean medieval water architecture and historical acoustic chambers with an architectural archivist.',
    'hidden_gems', 400, 700, 75,
    28.6258, 77.2250,
    array['step_free'],
    array['architecture', 'stepwell', 'hidden_spot', 'history'],
    4.7, 96, 'published',
    array['https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&auto=format&fit=crop&q=80'],
    'Dilli Khana & Heritage Guild', true, 92
  ),
  (
    'e7777777-7777-4777-8777-777777777777',
    'a1111111-1111-4111-8111-111111111111',
    'Chor Bazaar Vintage Brass & Antique Vinyl Safari',
    'Navigate collector corners discovering 1950s Bollywood press gramophone records, antique clocks, and brass lanterns.',
    'shopping_markets', 350, 600, 90,
    28.6473, 77.2384,
    array[]::text[],
    array['antiques', 'vinyl', 'markets', 'thrifting'],
    4.65, 93, 'published',
    array['https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&auto=format&fit=crop&q=80'],
    'Dilli Khana & Heritage Guild', true, 92
  ),
  (
    'e8888888-8888-4888-8888-888888888888',
    'a1111111-1111-4111-8111-111111111111',
    'Hauz Khas Heritage Indie Sitar & Spoken Word Baithak',
    'An intimate rooftop session blending classical sitar alaap with contemporary Hindustani spoken-word poetry.',
    'nightlife_entertainment', 650, 1100, 120,
    28.5494, 77.2001,
    array['wheelchair_accessible'],
    array['live_music', 'sitar', 'poetry', 'rooftop'],
    4.88, 90, 'published',
    array['https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'],
    'Dilli Khana & Heritage Guild', true, 92
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  price_min = excluded.price_min,
  price_max = excluded.price_max,
  rating_avg = excluded.rating_avg,
  locality_score = excluded.locality_score,
  offering_status = excluded.offering_status;

-- Availability Slots (Valid hex UUIDs)
insert into availability_slots (id, experience_id, start_time, end_time, capacity_remaining)
values
  ('f1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', now() + interval '1 hour', now() + interval '3 hours', 8),
  ('f2222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111', now() + interval '4 hours', now() + interval '6 hours', 6),
  ('f3333333-3333-4333-8333-333333333333', 'e2222222-2222-4222-8222-222222222222', now() + interval '2 hours', now() + interval '5 hours', 10),
  ('f4444444-4444-4444-8444-444444444444', 'e3333333-3333-4333-8333-333333333333', now() + interval '3 hours', now() + interval '6 hours', 12),
  ('f5555555-5555-4555-8555-555555555555', 'e4444444-4444-4444-8444-444444444444', now() + interval '1 hour', now() + interval '3 hours', 4),
  ('f6666666-6666-4666-8666-666666666666', 'e6666666-6666-4666-8666-666666666666', now() + interval '1 hour', now() + interval '2 hours', 15),
  ('f7777777-7777-4777-8777-777777777777', 'e7777777-7777-4777-8777-777777777777', now() + interval '2 hours', now() + interval '4 hours', 10),
  ('f8888888-8888-4888-8888-888888888888', 'e8888888-8888-4888-8888-888888888888', now() + interval '5 hours', now() + interval '7 hours', 10)
on conflict (id) do nothing;

-- Community Itineraries (Valid hex UUIDs)
insert into community_itineraries (id, title, destination, duration_days, budget, group_type, interests, travel_style, visibility)
values
  ('c1111111-1111-4111-8111-111111111111', 'Old Delhi Twilight Artisans & Flavors', 'Delhi', 1, 1500, 'couple', array['food_culinary', 'cultural_heritage'], 'Heritage explorer', 'public'),
  ('c2222222-2222-4222-8222-222222222222', 'Varanasi Awakening & Sacred River Life', 'Varanasi', 1, 1800, 'solo', array['cultural_heritage', 'hidden_gems'], 'Spiritual seeker', 'public'),
  ('c3333333-3333-4333-8333-333333333333', 'Rajasthan Clay & Campfire Melodies', 'Jaipur', 2, 3500, 'friends', array['workshops_classes', 'festivals_events'], 'Crafts & music lover', 'public')
on conflict (id) do nothing;
