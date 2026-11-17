// Silnik finansowy zleceń.
// Koszty i zysk liczymy netto. Cena dla klienta = koszt wyceny + marża (netto), a VAT (8% lub 23%) dolicza się na końcu.
// Należność od klienta liczymy od ceny brutto.

import { sumyWyceny, stawkaVat } from "./wyceny";

const suma = (lista, f) => lista.reduce((s, x) => s + (Number(f(x)) || 0), 0);

export const zl = (v) =>
  (Number(v) || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
export const kw = (v) => Math.round(Number(v) || 0).toLocaleString("pl-PL");
export const proc = (v) => `${Math.round(Number(v) || 0)}%`;

export const KATEGORIE_WYDATKOW = [
  { id: "material_gotowka", nazwa: "Materiał (zakup bezpośredni)" },
  { id: "sprzet", nazwa: "Sprzęt i narzędzia" },
  { id: "transport", nazwa: "Transport i paliwo" },
  { id: "robocizna_wlasna", nazwa: "Robocizna własna" },
  { id: "inne", nazwa: "Inne" },
];

export function nazwaKategorii(id) {
  return KATEGORIE_WYDATKOW.find(k => k.id === id)?.nazwa || id;
}

// Wycena będąca podstawą planu: najnowsza zaakceptowana, a jeśli jej nie ma — najnowsza.
export function wybierzWycene(wyceny) {
  const posortowane = [...wyceny].sort((a, b) => b.wersja - a.wersja);
  return posortowane.find(w => w.status === "zaakceptowana") || posortowane[0] || null;
}

export function liczFinanse({
  wycena = null,
  pozycjeWyceny = [],
  zamowienia = [],
  pozycjeZamowien = [],
  przypisania = [],
  wydatki = [],
  wplaty = [],
}) {
  // PLAN (z wyceny)
  const pozW = wycena ? pozycjeWyceny.filter(p => p.wycena_id === wycena.id) : [];
  const wartosc = (p) => Number(p.ilosc) * Number(p.cena_jednostkowa);
  const planMaterial = suma(pozW.filter(p => p.typ === "material"), wartosc);
  const planRobocizna = suma(pozW.filter(p => p.typ === "robocizna"), wartosc);
  const planKoszt = planMaterial + planRobocizna;
  const marzaProc = wycena ? Number(wycena.marza_procent) || 0 : 0;
  const vatProc = stawkaVat(wycena);
  const { netto: cena, vat, brutto: cenaBrutto } = sumyWyceny({ koszt: planKoszt, marzaProc, vatProc });

  // RZECZYWISTE KOSZTY
  // Materiały: zamówienia, które nie są już szkicem (wysłane / potwierdzone / dostarczone)
  const wyslane = new Set(zamowienia.filter(z => z.status !== "szkic").map(z => z.id));
  const pozZam = pozycjeZamowien.filter(p => wyslane.has(p.zamowienie_id));
  const matZamowione = suma(pozZam, p => Number(p.ilosc) * Number(p.cena_jednostkowa || 0));
  const bezCeny = pozZam.filter(p => !Number(p.cena_jednostkowa)).length;

  const wyd = (kat) => suma(wydatki.filter(w => w.kategoria === kat), w => w.kwota);
  const kosztMaterial = matZamowione + wyd("material_gotowka");

  // Robocizna: umowy z podwykonawcami (zobowiązania) + robocizna własna
  const umowy = suma(przypisania, p => p.stawka);
  const kosztRobocizna = umowy + wyd("robocizna_wlasna");

  const kosztPozostale = wyd("sprzet") + wyd("transport") + wyd("inne");
  const kosztRazem = kosztMaterial + kosztRobocizna + kosztPozostale;

  const wplacono = suma(wplaty, w => w.kwota);

  return {
    maWycene: !!wycena,
    marzaProc, vatProc, vat, cenaBrutto,
    planMaterial, planRobocizna, planKoszt, cena,
    matZamowione, bezCeny, umowy,
    kosztMaterial, kosztRobocizna, kosztPozostale, kosztRazem,
    wykorzystanie: planKoszt > 0 ? (kosztRazem / planKoszt) * 100 : null,
    planZysk: cena - planKoszt,
    zysk: cena - kosztRazem,
    wplacono,
    naleznosc: cenaBrutto - wplacono, // klient płaci kwotę brutto, więc wpłaty zestawiamy z ceną z VAT
  };
}

// Porównanie materiałów z wyceny z tym, co jest w zamówieniach (także w szkicach —
// po to, żeby wyłapać pomyłki, zanim zamówienie pójdzie do dostawcy).
export const STATUS_ZUZYCIA = {
  ok: "OK",
  mniej: "Zamówiono mniej",
  nie_zamowiono: "Nie zamówiono",
  wiecej: "Zamówiono więcej",
  poza_wycena: "Poza wyceną",
};

export function zuzycieMaterialow({ pozycjeWyceny = [], pozycjeZamowien = [] }) {
  const nazwaNorm = (p) => String(p.nazwa || "").trim();
  const klucz = (p) => `${nazwaNorm(p).toLowerCase()}|${p.jednostka || ""}`;
  const mapa = new Map();
  const wez = (p) => {
    const k = klucz(p);
    if (!mapa.has(k)) mapa.set(k, { klucz: k, nazwa: nazwaNorm(p), jednostka: p.jednostka, plan: 0, zamowiono: 0 });
    return mapa.get(k);
  };

  pozycjeWyceny.filter(p => p.typ === "material").forEach(p => { wez(p).plan += Number(p.ilosc) || 0; });
  pozycjeZamowien.forEach(p => { wez(p).zamowiono += Number(p.ilosc) || 0; });

  const tolerancja = 0.01;
  const wiersze = [...mapa.values()].map(r => {
    let status;
    if (r.plan === 0) status = "poza_wycena";
    else if (r.zamowiono === 0) status = "nie_zamowiono";
    else if (r.zamowiono > r.plan * (1 + tolerancja)) status = "wiecej";
    else if (r.zamowiono < r.plan * (1 - tolerancja)) status = "mniej";
    else status = "ok";
    return { ...r, roznica: r.zamowiono - r.plan, status };
  });

  const waga = { wiecej: 0, poza_wycena: 0, mniej: 1, nie_zamowiono: 1, ok: 2 };
  wiersze.sort((a, b) => waga[a.status] - waga[b.status] || a.nazwa.localeCompare(b.nazwa, "pl"));
  return wiersze;
}
