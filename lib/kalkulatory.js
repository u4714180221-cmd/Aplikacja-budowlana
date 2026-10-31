// Silnik kalkulatorów materiałowych.
// Zasada: liczymy WYŁĄCZNIE ilości materiału na podstawie parametrów podanych przez użytkownika.
// Nie dobieramy przekrojów, rozstawów ani nośności konstrukcji.

const n = (v) => parseFloat(String(v).replace(",", ".")) || 0;
const rad = (stopnie) => (stopnie * Math.PI) / 180;

export const METODY = [
  { id: "drewniana", nazwa: "Szkielet drewniany" },
  { id: "modulowa", nazwa: "Modułowa" },
  { id: "tradycyjna", nazwa: "Tradycyjna (murowana)" },
];

// Zapas: sztuki zawsze w górę do pełnych, reszta z zaokrągleniem
export function zZapasem(netto, procent, jednostka) {
  const v = netto * (1 + procent / 100);
  if (jednostka === "szt" || jednostka === "kpl") return Math.ceil(v);
  return jednostka === "m3" ? +v.toFixed(2) : +v.toFixed(1);
}

export function zaokraglNetto(netto, jednostka) {
  if (jednostka === "szt" || jednostka === "kpl") return Math.ceil(netto);
  return jednostka === "m3" ? +netto.toFixed(2) : +netto.toFixed(1);
}

export const KALKULATORY = [
  {
    id: "fundament_lawowy",
    nazwa: "Fundament ławowy",
    etap: "Fundamenty (kalkulator)",
    metody: ["drewniana", "tradycyjna"],
    uwaga: "Wymiary ław i ilość zbrojenia wynikają z projektu — wpisz wartości z projektu konstrukcyjnego.",
    pola: [
      { id: "dlugosc", label: "Łączna długość ław (mb)", domyslna: "36" },
      { id: "szerokosc", label: "Szerokość ławy (m)", domyslna: "0.6" },
      { id: "wysokosc", label: "Wysokość ławy (m)", domyslna: "0.4" },
      { id: "zbrojenie", label: "Zbrojenie (kg na m³ betonu)", domyslna: "90" },
    ],
    oblicz: (w) => {
      const dl = n(w.dlugosc), sz = n(w.szerokosc), wy = n(w.wysokosc), zb = n(w.zbrojenie);
      const v = dl * sz * wy;
      return [
        { id: "beton", nazwa: "Beton konstrukcyjny", netto: v, jednostka: "m3" },
        { id: "stal", nazwa: "Stal zbrojeniowa", netto: v * zb, jednostka: "kg" },
        { id: "deskowanie", nazwa: "Deskowanie ław", netto: 2 * dl * wy, jednostka: "m2" },
      ];
    },
  },
  {
    id: "sciany_szkieletowe",
    nazwa: "Ściany szkieletowe",
    etap: "Ściany szkieletowe (kalkulator)",
    metody: ["drewniana"],
    uwaga: "Przekrój i rozstaw słupków podajesz Ty lub konstruktor. Kalkulator liczy tylko ilości.",
    pola: [
      { id: "obwod", label: "Łączna długość ścian (mb)", domyslna: "36" },
      { id: "wysokosc", label: "Wysokość ścian (m)", domyslna: "2.6" },
      { id: "rozstaw", label: "Rozstaw słupków (cm)", domyslna: "60" },
      { id: "przekroj", label: "Przekrój słupków", domyslna: "4.5x14.5", tekst: true },
      { id: "otwory", label: "Powierzchnia otworów — okna, drzwi (m²)", domyslna: "12" },
    ],
    oblicz: (w) => {
      const ob = n(w.obwod), h = n(w.wysokosc), r = n(w.rozstaw), ot = n(w.otwory);
      const slupki = Math.ceil((ob * 100) / r) + 1 + 4; // + 4 narożniki
      const pow = Math.max(ob * h - ot, 0);
      return [
        { id: "slupki", nazwa: `Słupki ${w.przekroj}`, netto: slupki * h, jednostka: "mb" },
        { id: "rygle", nazwa: `Rygle (dolny + podwójny górny) ${w.przekroj}`, netto: 3 * ob, jednostka: "mb" },
        { id: "osb", nazwa: "Płyta OSB (poszycie)", netto: pow / 3.125, jednostka: "szt" },
        { id: "welna", nazwa: "Wełna mineralna", netto: pow, jednostka: "m2" },
        { id: "paro", nazwa: "Folia paroizolacyjna", netto: pow, jednostka: "m2" },
        { id: "wiatro", nazwa: "Membrana wiatroizolacyjna", netto: pow, jednostka: "m2" },
      ];
    },
  },
  {
    id: "sciany_murowane",
    nazwa: "Ściany murowane",
    etap: "Ściany murowane (kalkulator)",
    metody: ["tradycyjna"],
    uwaga: "Zużycie zaprawy jest orientacyjne i zależy od technologii (zaprawa tradycyjna / cienkowarstwowa).",
    pola: [
      { id: "obwod", label: "Łączna długość ścian (mb)", domyslna: "36" },
      { id: "wysokosc", label: "Wysokość ścian (m)", domyslna: "2.6" },
      { id: "otwory", label: "Powierzchnia otworów (m²)", domyslna: "12" },
      { id: "bl_dl", label: "Długość bloczka (cm)", domyslna: "59" },
      { id: "bl_wys", label: "Wysokość bloczka (cm)", domyslna: "24" },
      { id: "grubosc", label: "Grubość muru (cm)", domyslna: "24" },
      { id: "spoina", label: "Grubość spoiny (cm)", domyslna: "1" },
    ],
    oblicz: (w) => {
      const ob = n(w.obwod), h = n(w.wysokosc), ot = n(w.otwory);
      const dl = n(w.bl_dl), bw = n(w.bl_wys), t = n(w.grubosc), s = n(w.spoina);
      const pow = Math.max(ob * h - ot, 0);
      const sztNaM2 = 1 / (((dl + s) / 100) * ((bw + s) / 100));
      const udzialSpoin = 1 - (dl * bw) / ((dl + s) * (bw + s));
      return [
        { id: "bloczki", nazwa: `Bloczki ${dl}x${bw}x${t}`, netto: pow * sztNaM2, jednostka: "szt" },
        { id: "zaprawa", nazwa: "Zaprawa murarska", netto: pow * (t / 100) * udzialSpoin, jednostka: "m3" },
      ];
    },
  },
  {
    id: "wiezba",
    nazwa: "Więźba dachowa",
    etap: "Szkielet i więźba (kalkulator)",
    metody: ["drewniana", "tradycyjna"],
    uwaga: "Przekrój i rozstaw krokwi podajesz Ty lub konstruktor. Kalkulator liczy tylko ilości.",
    pola: [
      { id: "szerokosc", label: "Szerokość budynku (m)", domyslna: "8" },
      { id: "dlugosc", label: "Długość budynku (m)", domyslna: "10" },
      { id: "kat", label: "Kąt dachu (°)", domyslna: "30" },
      { id: "rozstaw", label: "Rozstaw krokwi (cm)", domyslna: "80" },
      { id: "okap", label: "Okap (m)", domyslna: "0.3" },
      { id: "przekroj", label: "Przekrój krokwi", domyslna: "8x16", tekst: true },
    ],
    oblicz: (w) => {
      const S = n(w.szerokosc), D = n(w.dlugosc), K = rad(n(w.kat)), R = n(w.rozstaw), ok = n(w.okap);
      const dlKrokwi = S / 2 / Math.cos(K) + ok;
      const liczba = Math.ceil((D * 100) / R) + 1; // krokwi na jednej połaci
      const krokwie = 2 * liczba * dlKrokwi; // dach dwuspadowy = dwie połacie
      const powDachu = 2 * D * dlKrokwi;
      return [
        { id: "krokwie", nazwa: `Krokwie ${w.przekroj}`, netto: krokwie, jednostka: "mb" },
        { id: "osb", nazwa: "Płyta OSB 18mm", netto: powDachu / 3.125, jednostka: "szt" },
        { id: "lacz", nazwa: "Łączniki ciesielskie", netto: krokwie * 0.7, jednostka: "szt" },
      ];
    },
  },
  {
    id: "pokrycie_dachu",
    nazwa: "Pokrycie dachu",
    etap: "Pokrycie dachu (kalkulator)",
    metody: ["drewniana", "tradycyjna"],
    uwaga: "Rozstaw łat zależy od rodzaju pokrycia — sprawdź w karcie producenta.",
    pola: [
      { id: "szerokosc", label: "Szerokość budynku (m)", domyslna: "8" },
      { id: "dlugosc", label: "Długość budynku (m)", domyslna: "10" },
      { id: "kat", label: "Kąt dachu (°)", domyslna: "30" },
      { id: "okap", label: "Okap (m)", domyslna: "0.3" },
      { id: "rozstaw_krokwi", label: "Rozstaw krokwi (cm)", domyslna: "80" },
      { id: "rozstaw_lat", label: "Rozstaw łat (cm)", domyslna: "35" },
    ],
    oblicz: (w) => {
      const S = n(w.szerokosc), D = n(w.dlugosc), K = rad(n(w.kat)), ok = n(w.okap);
      const rk = n(w.rozstaw_krokwi), rl = n(w.rozstaw_lat);
      const dlKrokwi = S / 2 / Math.cos(K) + ok;
      const pow = 2 * D * dlKrokwi;
      const rzedyLat = Math.ceil((dlKrokwi * 100) / rl) + 1;
      const liczbaKrokwi = Math.ceil((D * 100) / rk) + 1;
      return [
        { id: "pokrycie", nazwa: "Pokrycie dachu", netto: pow, jednostka: "m2" },
        { id: "folia", nazwa: "Folia wstępnego krycia", netto: pow, jednostka: "m2" },
        { id: "kontrlaty", nazwa: "Kontrłaty", netto: 2 * liczbaKrokwi * dlKrokwi, jednostka: "mb" },
        { id: "laty", nazwa: "Łaty", netto: rzedyLat * D * 2, jednostka: "mb" },
      ];
    },
  },
  {
    id: "moduly",
    nazwa: "Moduły i posadowienie",
    etap: "Moduły i posadowienie (kalkulator)",
    metody: ["modulowa"],
    uwaga: "Liczba podpór, śrub i beton na stopę to normy orientacyjne — popraw je wg dokumentacji producenta modułów.",
    pola: [
      { id: "liczba", label: "Liczba modułów", domyslna: "4" },
      { id: "podpory", label: "Punktów podparcia na moduł", domyslna: "6" },
      { id: "beton_stopa", label: "Beton na jedną stopę (m³)", domyslna: "0.25" },
      { id: "sruby", label: "Śrub kotwiących na moduł", domyslna: "8" },
      { id: "styki", label: "Liczba styków między modułami", domyslna: "3" },
      { id: "tasma_styk", label: "Taśma uszczelniająca na jeden styk (mb)", domyslna: "12" },
    ],
    oblicz: (w) => {
      const L = n(w.liczba), p = n(w.podpory);
      const b = n(w.beton_stopa), s = n(w.sruby), st = n(w.styki), ts = n(w.tasma_styk);
      return [
        { id: "stopy", nazwa: "Beton na stopy fundamentowe", netto: L * p * b, jednostka: "m3" },
        { id: "sruby", nazwa: "Śruby kotwiące", netto: L * s, jednostka: "szt" },
        { id: "tasma", nazwa: "Taśma uszczelniająca styków", netto: st * ts, jednostka: "mb" },
      ];
    },
  },
];

// ---------------------------------------------------------------------------
// DANE BUDYNKU WSPÓŁDZIELONE MIĘDZY KALKULATORAMI
// Kalkulator materiałowy zapisuje przy zleceniu wymiary budynku,
// a kalkulator instalacyjny podpowiada na ich podstawie wartości początkowe.
// ---------------------------------------------------------------------------

export function parametryZKalkulatora(kalkId, w) {
  const p = {};
  if (kalkId === "wiezba" || kalkId === "pokrycie_dachu") {
    p.szerokosc_budynku = n(w.szerokosc);
    p.dlugosc_budynku = n(w.dlugosc);
    p.kat_dachu = n(w.kat);
  }
  if (kalkId === "sciany_szkieletowe" || kalkId === "sciany_murowane") {
    p.obwod_scian = n(w.obwod);
    p.wysokosc_scian = n(w.wysokosc);
    p.otwory_m2 = n(w.otwory);
  }
  if (kalkId === "moduly") {
    p.liczba_modulow = n(w.liczba);
  }
  return p;
}

export function powierzchniaZabudowy(par) {
  const a = n(par?.szerokosc_budynku), b = n(par?.dlugosc_budynku);
  return a > 0 && b > 0 ? Math.round(a * b) : null;
}

export function opisParametrow(par) {
  if (!par) return "";
  const cz = [];
  const pow = powierzchniaZabudowy(par);
  if (pow) cz.push(`budynek ${par.szerokosc_budynku} × ${par.dlugosc_budynku} m (zabudowa ok. ${pow} m²)`);
  if (par.obwod_scian) cz.push(`ściany ${par.obwod_scian} mb, wysokość ${par.wysokosc_scian} m`);
  if (par.liczba_modulow) cz.push(`${par.liczba_modulow} modułów`);
  return cz.join("; ");
}

// ---------------------------------------------------------------------------
// KALKULATORY INSTALACYJNE
// Przybliżone ilości materiałów do zamówienia i wstępnej wyceny.
// To NIE jest projekt instalacji — projekt i rozmieszczenie wykonuje uprawniony instalator/elektryk.
// Wartości początkowe (normy na m², na punkt) są orientacyjne i zawsze do poprawienia.
// bezZapasu: true = element liczony sztukowo dokładnie (urządzenia), bez doliczania zapasu.
// ---------------------------------------------------------------------------

const UWAGA_INSTALACJE =
  "Ilości szacunkowe do zamówienia i wstępnej wyceny — to nie jest projekt instalacji. Projekt, przekroje i rozmieszczenie ustala uprawniony instalator.";

export const KALKULATORY_INSTALACYJNE = [
  {
    id: "elektryka",
    nazwa: "Elektryka",
    etap: "Instalacja elektryczna (kalkulator)",
    uwaga: UWAGA_INSTALACJE,
    pola: [
      { id: "gniazda", label: "Gniazda (szt)", domyslna: "30" },
      { id: "swiatla", label: "Punkty świetlne (szt)", domyslna: "15" },
      { id: "wlaczniki", label: "Łączniki światła (szt)", domyslna: "12" },
      { id: "obwody", label: "Obwody w rozdzielnicy (szt)", domyslna: "12" },
      { id: "mb_gniazdo", label: "Przewód na gniazdo (mb)", domyslna: "9" },
      { id: "mb_swiatlo", label: "Przewód na punkt świetlny (mb)", domyslna: "8" },
    ],
    domyslne: (pow) =>
      pow
        ? {
            gniazda: String(Math.round(pow / 3)),
            swiatla: String(Math.round(pow / 6)),
            wlaczniki: String(Math.round(pow / 8)),
            obwody: String(Math.max(8, Math.round(pow / 7))),
          }
        : {},
    oblicz: (w) => {
      const g = n(w.gniazda), sw = n(w.swiatla), wl = n(w.wlaczniki), ob = n(w.obwody);
      return [
        { id: "p25", nazwa: "Przewód 3x2,5 mm² (gniazda)", netto: g * n(w.mb_gniazdo), jednostka: "mb" },
        { id: "p15", nazwa: "Przewód 3x1,5 mm² (oświetlenie)", netto: sw * n(w.mb_swiatlo), jednostka: "mb" },
        { id: "puszki", nazwa: "Puszki podtynkowe (gniazda i łączniki)", netto: g + wl, jednostka: "szt" },
        { id: "puszki_sw", nazwa: "Puszki oświetleniowe", netto: sw, jednostka: "szt" },
        { id: "gniazda", nazwa: "Gniazda podtynkowe", netto: g, jednostka: "szt", bezZapasu: true },
        { id: "laczniki", nazwa: "Łączniki światła", netto: wl, jednostka: "szt", bezZapasu: true },
        { id: "wylaczniki", nazwa: "Wyłączniki nadprądowe", netto: ob, jednostka: "szt", bezZapasu: true },
      ];
    },
  },
  {
    id: "wodkan",
    nazwa: "Wod-kan",
    etap: "Instalacja wodno-kanalizacyjna (kalkulator)",
    uwaga: UWAGA_INSTALACJE,
    pola: [
      { id: "punkty_zimna", label: "Punkty poboru wody zimnej (szt)", domyslna: "8" },
      { id: "punkty_cwu", label: "Punkty z ciepłą wodą (szt)", domyslna: "6" },
      { id: "odl", label: "Średnia odległość od pionu (m)", domyslna: "6" },
      { id: "srednica", label: "Średnica rur wodnych (mm)", domyslna: "16", tekst: true },
      { id: "kolanka_pkt", label: "Kolanek na punkt (szt)", domyslna: "3" },
      { id: "trojniki_pkt", label: "Trójników na punkt (szt)", domyslna: "1" },
      { id: "zawory_pkt", label: "Zaworów na punkt (szt)", domyslna: "1" },
      { id: "punkty_kan", label: "Punkty kanalizacyjne (szt)", domyslna: "6" },
      { id: "odl_kan", label: "Średnia odległość do pionu kan. (m)", domyslna: "4" },
      { id: "srednica_kan", label: "Średnica rur kan. (mm)", domyslna: "50", tekst: true },
      { id: "kolana_kan", label: "Kolan kan. na punkt (szt)", domyslna: "2" },
    ],
    oblicz: (w) => {
      const z = n(w.punkty_zimna), c = n(w.punkty_cwu), odl = n(w.odl);
      const pw = z + c;
      const pk = n(w.punkty_kan);
      return [
        { id: "rura_zimna", nazwa: `Rura wodna Ø${w.srednica} (zimna)`, netto: z * odl, jednostka: "mb" },
        { id: "rura_cwu", nazwa: `Rura wodna Ø${w.srednica} (ciepła)`, netto: c * odl, jednostka: "mb" },
        { id: "kolanka", nazwa: `Kolanka Ø${w.srednica}`, netto: pw * n(w.kolanka_pkt), jednostka: "szt" },
        { id: "trojniki", nazwa: `Trójniki Ø${w.srednica}`, netto: pw * n(w.trojniki_pkt), jednostka: "szt" },
        { id: "zawory", nazwa: `Zawory odcinające Ø${w.srednica}`, netto: pw * n(w.zawory_pkt), jednostka: "szt", bezZapasu: true },
        { id: "rura_kan", nazwa: `Rura kanalizacyjna Ø${w.srednica_kan}`, netto: pk * n(w.odl_kan), jednostka: "mb" },
        { id: "kolana_kan", nazwa: `Kolana kanalizacyjne Ø${w.srednica_kan}`, netto: pk * n(w.kolana_kan), jednostka: "szt" },
      ];
    },
  },
  {
    id: "ogrzewanie_podlogowe",
    nazwa: "Ogrzewanie podłogowe",
    etap: "Ogrzewanie podłogowe (kalkulator)",
    uwaga: UWAGA_INSTALACJE + " Grzejniki i źródło ciepła nie są tu liczone.",
    pola: [
      { id: "powierzchnia", label: "Powierzchnia ogrzewana (m²)", domyslna: "80" },
      { id: "rozstaw", label: "Rozstaw rur (cm)", domyslna: "15" },
      { id: "max_petla", label: "Maks. długość jednej pętli (m)", domyslna: "100" },
      { id: "dojscie", label: "Dojście do rozdzielacza na pętlę (mb)", domyslna: "10" },
      { id: "srednica", label: "Rura grzewcza (mm)", domyslna: "16x2", tekst: true },
      { id: "obwod_pom", label: "Obwód ogrzewanych pomieszczeń (mb)", domyslna: "70" },
    ],
    domyslne: (pow) =>
      pow ? { powierzchnia: String(pow), obwod_pom: String(Math.round(pow * 0.9)) } : {},
    oblicz: (w) => {
      const pow = n(w.powierzchnia), roz = n(w.rozstaw) / 100, maxP = n(w.max_petla);
      const uklad = roz > 0 ? pow / roz : 0;
      const petle = maxP > 0 ? Math.max(1, Math.ceil(uklad / maxP)) : 1;
      return [
        { id: "rura", nazwa: `Rura grzewcza ${w.srednica}`, netto: uklad + petle * n(w.dojscie), jednostka: "mb" },
        { id: "plyta", nazwa: "Płyta izolacyjna systemowa", netto: pow, jednostka: "m2" },
        { id: "tasma", nazwa: "Taśma brzegowa", netto: n(w.obwod_pom), jednostka: "mb" },
        { id: "rozdzielacz", nazwa: `Rozdzielacz podłogowy (${petle} obwodów)`, netto: 1, jednostka: "szt", bezZapasu: true },
      ];
    },
  },
];
