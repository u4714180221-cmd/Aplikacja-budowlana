# Aplikacja budowlana — szkielet startowy

Co już działa: logowanie (Supabase Auth), Pulpit, Zlecenia i Kontakty podłączone do prawdziwej bazy danych, z dodawaniem nowych pozycji. Wyceny, Kalkulator i Zamówienia to na razie zaślepki — dopiszemy je w kolejnym kroku.

## Co zrobić dziś wieczorem (ok. 20 minut)

### 1. Supabase (baza danych + logowanie)
1. Wejdź na https://supabase.com, załóż darmowe konto, utwórz nowy projekt.
2. W panelu projektu: **SQL Editor → New query** → wklej całą zawartość pliku `supabase/schema.sql` z tego projektu → **Run**.
3. W panelu: **Authentication → Users → Add user** → utwórz swoje konto (e-mail + hasło), którym będziesz się logować do aplikacji.
4. W panelu: **Project Settings → API** → skopiuj `Project URL` oraz `anon public` key.

### 2. Podłączenie kluczy
1. W folderze projektu skopiuj plik `.env.local.example` jako `.env.local`.
2. Wklej do niego URL i klucz z Supabase.

### 3. GitHub
1. Załóż konto na https://github.com (jeśli jeszcze nie masz).
2. Utwórz nowe, prywatne repozytorium, np. `aplikacja-budowlana`.
3. Wypchnij ten projekt do repozytorium (instrukcja pojawi się na stronie nowego repo pod "…or push an existing repository").

### 4. Uruchomienie lokalnie (opcjonalnie, do testów)
```
npm install
npm run dev
```
Aplikacja wystartuje na http://localhost:3000 — zaloguj się kontem utworzonym w kroku 1.3.

### 5. Wdrożenie na Vercel (żeby działało na telefonie, nie tylko na komputerze)
1. Wejdź na https://vercel.com, zaloguj się przez GitHub.
2. **Add New → Project** → wybierz repozytorium `aplikacja-budowlana`.
3. W ustawieniach projektu dodaj te same dwie zmienne co w `.env.local` (Environment Variables).
4. Deploy. Po chwili dostaniesz link do działającej aplikacji.

## Co dalej

Jak to zadziała, wracamy do kodu i dopisujemy: Wyceny (edytor pozycji), Kalkulator materiałowy (pierwszy silnik liczący) i Zamówienia — zgodnie z planem faz.

Publikacja w Google Play (TWA + Bubblewrap) to osobny krok na sam koniec, gdy aplikacja będzie już w pełni działać pod własną domeną z https.
