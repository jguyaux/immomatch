-- Migration: ajouter latitude/longitude aux properties
alter table public.properties add column if not exists latitude double precision;
alter table public.properties add column if not exists longitude double precision;
