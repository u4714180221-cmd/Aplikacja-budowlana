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
