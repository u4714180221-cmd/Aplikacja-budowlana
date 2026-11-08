-- Aktualizacja bazy do Fazy 10: podwykonawcy, terminy i wypłaty.
-- Uruchom w Supabase: SQL Editor -> New query -> wklej całość -> Run.
-- Można uruchomić wielokrotnie, nic nie zepsuje.

alter table zlecenie_podwykonawcy
  add column if not exists termin_start date,
  add column if not exists termin_koniec date;

create table if not exists platnosci_podwykonawcow (
  id uuid primary key default gen_random_uuid(),
  przypisanie_id uuid references zlecenie_podwykonawcy(id) on delete cascade not null,
  kwota numeric(10,2) not null,
  data date not null default current_date,
  opis text,
  utworzono timestamptz default now()
);

alter table platnosci_podwykonawcow enable row level security;
drop policy if exists "zalogowani maja dostep" on platnosci_podwykonawcow;
create policy "zalogowani maja dostep" on platnosci_podwykonawcow
  for all using (auth.role() = 'authenticated');
