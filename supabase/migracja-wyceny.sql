-- Aktualizacja bazy: nazwa wyceny i stawka VAT.
-- Uruchom w Supabase: SQL Editor -> New query -> wklej całość -> Run.
-- Można uruchomić wielokrotnie, nic nie zepsuje.

alter table wyceny add column if not exists nazwa text;
alter table wyceny add column if not exists stawka_vat smallint not null default 23
  check (stawka_vat in (8, 23));
