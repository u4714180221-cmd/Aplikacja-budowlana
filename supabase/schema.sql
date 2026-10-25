-- Schemat bazy danych aplikacji budowlanej
-- Uruchom w Supabase: Project -> SQL Editor -> New query -> wklej całość -> Run

create extension if not exists "uuid-ossp";

-- KONTAKTY: klienci, dostawcy, podwykonawcy w jednej tabeli, rozróżnieni polem "typ"
create table kontakty (
  id uuid primary key default uuid_generate_v4(),
  nazwa text not null,
  typ text not null check (typ in ('klient', 'dostawca', 'podwykonawca')),
  telefon text,
  email text,
  adres text,
  utworzono timestamptz default now()
);

-- ZLECENIA
create table zlecenia (
  id uuid primary key default uuid_generate_v4(),
  klient_id uuid references kontakty(id),
  nazwa text not null,
  adres text,
  metoda_budowy text check (metoda_budowy in ('drewniana', 'modulowa', 'tradycyjna', 'inna')),
  status text not null default 'szkic' check (status in ('szkic', 'w_toku', 'wyslane', 'zatwierdzone', 'problem', 'zakonczone')),
  termin_start date,
  termin_koniec date,
  utworzono timestamptz default now()
);

-- KATALOG MATERIAŁÓW
create table materialy (
  id uuid primary key default uuid_generate_v4(),
  nazwa text not null,
  jednostka text not null,       -- np. mb, m2, m3, szt
  cena numeric(10,2) not null default 0,
  dostawca_id uuid references kontakty(id),
  cena_zaktualizowano timestamptz default now()
);

-- WYCENY (wersjonowane per zlecenie)
create table wyceny (
  id uuid primary key default uuid_generate_v4(),
  zlecenie_id uuid references zlecenia(id) not null,
  wersja int not null default 1,
  marza_procent numeric(5,2) default 15,
  status text not null default 'szkic' check (status in ('szkic', 'wyslana', 'zaakceptowana', 'odrzucona')),
  utworzono timestamptz default now()
);

-- POZYCJE WYCENY
create table wycena_pozycje (
  id uuid primary key default uuid_generate_v4(),
  wycena_id uuid references wyceny(id) not null,
  etap text,                      -- np. "Szkielet i więźba", "Pokrycie dachu"
  nazwa text not null,
  ilosc numeric(10,2) not null,
  jednostka text not null,
  cena_jednostkowa numeric(10,2) not null,
  typ text check (typ in ('material', 'robocizna')) default 'material',
  kolejnosc int default 0
);

-- ZAMÓWIENIA MATERIAŁÓW (grupowane per dostawca)
create table zamowienia (
  id uuid primary key default uuid_generate_v4(),
  zlecenie_id uuid references zlecenia(id) not null,
  dostawca_id uuid references kontakty(id) not null,
  status text not null default 'szkic' check (status in ('szkic', 'wyslane', 'potwierdzone', 'dostarczone')),
  utworzono timestamptz default now()
);

-- POZYCJE ZAMÓWIENIA
create table zamowienie_pozycje (
  id uuid primary key default uuid_generate_v4(),
  zamowienie_id uuid references zamowienia(id) not null,
  material_id uuid references materialy(id),
  nazwa text not null,
  ilosc numeric(10,2) not null,
  jednostka text not null,
  cena_jednostkowa numeric(10,2)
);

-- PODWYKONAWCY NA ZLECENIU
create table zlecenie_podwykonawcy (
  id uuid primary key default uuid_generate_v4(),
  zlecenie_id uuid references zlecenia(id) not null,
  podwykonawca_id uuid references kontakty(id) not null,
  zakres_prac text,
  stawka numeric(10,2),
  status text not null default 'ustalony' check (status in ('ustalony', 'w_trakcie', 'odebrany'))
);

-- Row Level Security: tylko zalogowani użytkownicy firmy mają dostęp (MVP: każdy zalogowany widzi wszystko)
alter table kontakty enable row level security;
alter table zlecenia enable row level security;
alter table materialy enable row level security;
alter table wyceny enable row level security;
alter table wycena_pozycje enable row level security;
alter table zamowienia enable row level security;
alter table zamowienie_pozycje enable row level security;
alter table zlecenie_podwykonawcy enable row level security;

create policy "zalogowani maja dostep" on kontakty for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on zlecenia for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on materialy for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on wyceny for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on wycena_pozycje for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on zamowienia for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on zamowienie_pozycje for all using (auth.role() = 'authenticated');
create policy "zalogowani maja dostep" on zlecenie_podwykonawcy for all using (auth.role() = 'authenticated');
