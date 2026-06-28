-- ImmoMatch — Schema Supabase
-- Executer dans l'editeur SQL de Supabase

-- Table des preferences utilisateur
create table public.user_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  budget_min integer not null default 0,
  budget_max integer not null default 500000,
  zones text[] not null default '{}',
  property_types text[] not null default '{}',
  bedrooms_min integer not null default 1,
  bedrooms_max integer,
  surface_min integer,
  surface_max integer,
  peb_scores text[] not null default '{}',
  features text[] not null default '{}',
  deal_breakers text[] not null default '{}',
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Table des biens immobiliers
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  external_id text unique not null,
  source text not null default 'immoweb',
  url text not null,
  title text not null,
  description text,
  price integer not null,
  property_type text not null,
  bedrooms integer,
  bathrooms integer,
  surface integer,
  land_surface integer,
  peb_score text,
  address text,
  zip_code text,
  city text,
  province text,
  image_urls text[] not null default '{}',
  features text[] not null default '{}',
  raw_data jsonb,
  scraped_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- Table des matchs (scoring IA)
create table public.property_matches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  score integer not null check (score >= 0 and score <= 100),
  reasoning text not null,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  is_favorite boolean not null default false,
  is_viewed boolean not null default false,
  is_dismissed boolean not null default false,
  created_at timestamptz default now() not null,
  unique(user_id, property_id)
);

-- Index
create index idx_properties_external_id on public.properties(external_id);
create index idx_properties_city on public.properties(city);
create index idx_properties_price on public.properties(price);
create index idx_matches_user_score on public.property_matches(user_id, score desc);
create index idx_matches_user_favorite on public.property_matches(user_id, is_favorite) where is_favorite = true;

-- RLS (Row Level Security)
alter table public.user_preferences enable row level security;
alter table public.properties enable row level security;
alter table public.property_matches enable row level security;

create policy "Users can read own preferences"
  on public.user_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own preferences"
  on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own preferences"
  on public.user_preferences for update using (auth.uid() = user_id);

create policy "Anyone can read properties"
  on public.properties for select using (true);
create policy "Service role can insert properties"
  on public.properties for insert with check (true);
create policy "Service role can update properties"
  on public.properties for update using (true);

create policy "Users can read own matches"
  on public.property_matches for select using (auth.uid() = user_id);
create policy "Service role can insert matches"
  on public.property_matches for insert with check (true);
create policy "Users can update own matches"
  on public.property_matches for update using (auth.uid() = user_id);

-- Trigger updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_user_preferences_updated
  before update on public.user_preferences
  for each row execute function public.handle_updated_at();
