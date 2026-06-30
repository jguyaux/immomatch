-- Migration: ajouter transaction_type aux user_preferences
alter table public.user_preferences add column if not exists transaction_type text not null default 'achat';
