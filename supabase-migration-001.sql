-- Migration: ajouter is_validated aux property_matches
alter table public.property_matches add column if not exists is_validated boolean not null default false;
