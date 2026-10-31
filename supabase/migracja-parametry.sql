-- Aktualizacja bazy: dane budynku przy zleceniu (wymiary, obwód ścian itd.)
-- Dzięki temu kalkulator instalacyjny może korzystać z wyników kalkulatora materiałowego.
-- Uruchom w Supabase: SQL Editor -> New query -> wklej -> Run. Można uruchomić wielokrotnie, nic nie zepsuje.

alter table zlecenia add column if not exists parametry jsonb default '{}'::jsonb;
