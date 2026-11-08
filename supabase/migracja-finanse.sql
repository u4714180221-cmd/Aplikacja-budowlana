-- Aktualizacja bazy do Fazy 11: wydatki na zleceniu i wpłaty od klienta.
-- Uruchom w Supabase: SQL Editor -> New query -> wklej całość -> Run.
-- Można uruchomić wielokrotnie, nic nie zepsuje.

create table if not exists wydatki (
  id uuid primary key default gen_random_uuid(),
  zlecenie_id uuid references zlecenia(id) on delete cascade not null,
  kategoria text not null check (kategoria in ('material_gotowka', 'sprzet', 'transport', 'robocizna_wlasna', 'inne')),
  opis text,
  kwota numeric(10,2) not null,
  data date not null default current_date,
  utworzono timestamptz default now()
);

create table if not exists wplaty_klienta (
  id uuid primary key default gen_random_uuid(),
  zlecenie_id uuid references zlecenia(id) on delete cascade not null,
  kwota numeric(10,2) not null,
  data date not null default current_date,
  opis text,
  utworzono timestamptz default now()
);

alter table wydatki enable row level security;
alter table wplaty_klienta enable row level security;

drop policy if exists "zalogowani maja dostep" on wydatki;
drop policy if exists "zalogowani maja dostep" on wplaty_klienta;
create policy "zalogowani maja dostep" on wydatki for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on wplaty_klienta for all using (auth.role() = 'authenticated');
