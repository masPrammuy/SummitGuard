-- =============================================================================
-- SummitGuard: Supabase PostgreSQL Database Setup & Security Schema
-- Skema Database PostgreSQL, Otomasi Trigger Registrasi & Row Level Security (RLS)
-- =============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABEL: PROFILES
-- Menyimpan informasi profil pengguna yang terhubung dengan akun auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text default 'Pendaki',
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TRIGGER OTOMASI: handle_new_user()
-- Menyalin pengguna baru dari auth.users (email/password & Google OAuth) ke public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'role', 'Pendaki'),
    new.email,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      null
    )
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. TABEL: MOUNTAINS
-- Katalog gunung, kuota harian SIMAKSI, dan status peringatan cuaca BMKG
create table if not exists public.mountains (
  id text primary key,
  name text not null,
  elevation text not null,
  province text not null,
  basecamps jsonb not null default '[]'::jsonb,
  daily_quota int not null default 400,
  remaining_quota int not null default 400,
  ticket_price int not null default 25000,
  weather jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABEL: BOOKINGS
-- Riwayat perizinan SIMAKSI, rombongan pendaki, dan status mitigasi darurat
create table if not exists public.bookings (
  id text primary key,
  user_id uuid references auth.users on delete set null,
  mountain_id text references public.mountains(id) on delete restrict,
  mountain_name text not null,
  basecamp text not null,
  climb_date date not null,
  duration_days int default 2,
  leader jsonb not null default '{}'::jsonb,
  members_count int not null default 1,
  members jsonb not null default '[]'::jsonb,
  addons jsonb not null default '{}'::jsonb,
  total_payment int not null default 0,
  status text not null default 'CONFIRMED',
  mitigation_choice text,
  high_risk_waiver_signed boolean default false,
  rescheduled_from date,
  refund_details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.mountains enable row level security;
alter table public.bookings enable row level security;

-- Policies: PROFILES
drop policy if exists "Profiles viewable by everyone" on public.profiles;
create policy "Profiles viewable by everyone" on public.profiles
  for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Policies: MOUNTAINS
drop policy if exists "Mountains viewable by everyone" on public.mountains;
create policy "Mountains viewable by everyone" on public.mountains
  for select using (true);

drop policy if exists "Mountains updatable by authenticated or anon for simulation" on public.mountains;
create policy "Mountains updatable by authenticated or anon for simulation" on public.mountains
  for update using (true);

drop policy if exists "Mountains insertable" on public.mountains;
create policy "Mountains insertable" on public.mountains
  for insert with check (true);

-- Policies: BOOKINGS
drop policy if exists "Bookings viewable by authenticated users or booking owner" on public.bookings;
create policy "Bookings viewable by authenticated users or booking owner" on public.bookings
  for select using (true);

drop policy if exists "Users can insert bookings" on public.bookings;
create policy "Users can insert bookings" on public.bookings
  for insert with check (true);

drop policy if exists "Users can update bookings" on public.bookings;
create policy "Users can update bookings" on public.bookings
  for update using (true);

-- 7. INITIAL SEED DATA FOR MOUNTAINS
insert into public.mountains (id, name, elevation, province, basecamps, daily_quota, remaining_quota, ticket_price, weather, updated_at)
values
(
  'merbabu',
  'Gunung Merbabu',
  '3.142 mdpl',
  'Jawa Tengah',
  '["Selo", "Suwanting", "Thekelan", "Wekas"]'::jsonb,
  400,
  128,
  25000,
  '{
    "status": "warning",
    "condition": "Badai Hujan & Angin Kencang",
    "temp": "8°C",
    "windSpeed": "48 knot",
    "warningActive": true,
    "warningMessage": "BMKG mengeluarkan peringatan dini badai petir dan angin kencang di ketinggian >2.000 mdpl."
  }'::jsonb,
  now()
),
(
  'prau',
  'Gunung Prau',
  '2.565 mdpl',
  'Jawa Tengah',
  '["Dieng", "Patakbanteng", "Kalilembu", "Dwarawati", "Wates", "Igirmranak"]'::jsonb,
  500,
  340,
  30000,
  '{
    "status": "safe",
    "condition": "Cerah Berawan",
    "temp": "14°C",
    "windSpeed": "12 knot",
    "warningActive": false,
    "warningMessage": "Kondisi cuaca terpantau aman dan kondusif untuk aktivitas pendakian."
  }'::jsonb,
  now()
),
(
  'gede',
  'Gunung Gede Pangrango',
  '2.958 mdpl',
  'Jawa Barat',
  '["Cibodas", "Gunung Putri", "Selabintana"]'::jsonb,
  600,
  215,
  35000,
  '{
    "status": "safe",
    "condition": "Kabut Tipis & Hujan Ringan",
    "temp": "11°C",
    "windSpeed": "18 knot",
    "warningActive": false,
    "warningMessage": "Waspada jalur licin di pos 2-3, angin dalam batas aman."
  }'::jsonb,
  now()
)
on conflict (id) do update set
  name = excluded.name,
  elevation = excluded.elevation,
  province = excluded.province,
  basecamps = excluded.basecamps,
  daily_quota = excluded.daily_quota,
  remaining_quota = excluded.remaining_quota,
  ticket_price = excluded.ticket_price,
  weather = excluded.weather,
  updated_at = excluded.updated_at;
