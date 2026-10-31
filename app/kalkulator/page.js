"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import {
  METODY, KALKULATORY, KALKULATORY_INSTALACYJNE,
  zZapasem, zaokraglNetto, parametryZKalkulatora, powierzchniaZabudowy, opisParametrow,
} from "../../lib/kalkulatory";

const TRYBY = [
  { id: "materialowy", nazwa: "Kalkulator materiałowy", opis: "Konstrukcja: fundamenty, ściany, dach" },
  { id: "instalacyjny", nazwa: "Kalkulator instalacyjny", opis: "Elektryka, wod-kan, ogrzewanie" },
];

function listaKalkulatorow(tryb, metoda) {
  return tryb === "materialowy" ? KALKULATORY.filter(k => k.metody.includes(metoda)) : KALKULATORY_INSTALACYJNE;
}

// Wartości początkowe formularza: domyślne z definicji + podpowiedzi z danych budynku zlecenia
function wartosciPoczatkowe(kalk, par) {
  const w = {};
  kalk.pola.forEach(p => { w[p.id] = p.domyslna; });
  if (kalk.domyslne) Object.assign(w, kalk.domyslne(powierzchniaZabudowy(par)));
  return w;
}

export default function Kalkulator() {
  const router = useRouter();
  const [zlecenia, setZlecenia] = useState([]);
  const [zlecenieId, setZlecenieId] = useState("");
  const [brakKolumny, setBrakKolumny] = useState(false);

  const [tryb, setTryb] = useState("materialowy");
  const [menuOtwarte, setMenuOtwarte] = useState(false);
  const [metoda, setMetoda] = useState("drewniana");
  const [kalkId, setKalkId] = useState("fundament_lawowy");

  const dostepne = listaKalkulatorow(tryb, metoda);
  const kalk = dostepne.find(k => k.id === kalkId) || dostepne[0];
  const aktywnyTryb = TRYBY.find(t => t.id === tryb);
  const zlecenie = zlecenia.find(z => z.id === zlecenieId);
  const par = zlecenie?.parametry || {};

  const [wartosci, setWartosci] = useState(wartosciPoczatkowe(KALKULATORY[0], {}));
  const [zapas, setZapas] = useState("10");
  const [krok, setKrok] = useState("formularz");
  const [wynik, setWynik] = useState([]);
  const [zapisywanie, setZapisywanie] = useState(false);

  useEffect(() => {
    (async () => {
      let { data, error } = await supabase.from("zlecenia").select("id, nazwa, parametry").order("utworzono", { ascending: false });
      if (error) {
        // kolumna "parametry" jeszcze nie istnieje w bazie — kalkulator działa dalej, bez współdzielenia danych
        const r = await supabase.from("zlecenia").select("id, nazwa").order("utworzono", { ascending: false });
        data = r.data;
        setBrakKolumny(true);
      }
      setZlecenia(data || []);
    })();
  }, []);

  function przygotuj(kalkObj, parametry) {
    setKalkId(kalkObj.id);
    setWartosci(wartosciPoczatkowe(kalkObj, parametry));
    setKrok("formularz");
  }

  function zmienTryb(t) {
    setTryb(t);
    setMenuOtwarte(false);
    przygotuj(listaKalkulatorow(t, metoda)[0], par);
  }

  function zmienMetode(m) {
    setMetoda(m);
    przygotuj(listaKalkulatorow(tryb, m)[0], par);
  }

  function zmienZlecenie(id) {
    setZlecenieId(id);
    if (tryb === "instalacyjny") {
      const z = zlecenia.find(x => x.id === id);
      setWartosci(wartosciPoczatkowe(kalk, z?.parametry || {}));
    }
  }

  async function zapiszParametry() {
    const nowe = parametryZKalkulatora(kalk.id, wartosci);
    if (!zlecenieId || Object.keys(nowe).length === 0) return;
    const scalone = { ...(zlecenie?.parametry || {}), ...nowe };
    const { error } = await supabase.from("zlecenia").update({ parametry: scalone }).eq("id", zlecenieId);
    if (error) { setBrakKolumny(true); return; }
    setZlecenia(l => l.map(z => z.id === zlecenieId ? { ...z, parametry: scalone } : z));
  }

  function oblicz(e) {
    e.preventDefault();
    const Z = parseFloat(zapas) || 0;
    const pozycje = kalk.oblicz(wartosci).map(p => ({
      id: p.id,
      nazwa: p.nazwa,
      jednostka: p.jednostka,
      bezZapasu: !!p.bezZapasu,
      iloscNetto: zaokraglNetto(p.netto, p.jednostka),
      ilosc: p.bezZapasu ? zaokraglNetto(p.netto, p.jednostka) : zZapasem(p.netto, Z, p.jednostka),
      cena: "",
    }));
    setWynik(pozycje);
    setKrok("wynik");
    if (tryb === "materialowy") zapiszParametry();
  }

  function zmienWynik(id, pole, wartosc) {
    setWynik(w => w.map(p => p.id === id ? { ...p, [pole]: wartosc } : p));
  }

  async function dodajDoWyceny() {
    if (!zlecenieId) { alert("Wybierz zlecenie, do którego dodać wycenę."); return; }
    setZapisywanie(true);
    const { data: wyc } = await supabase.from("wyceny").select("*").eq("zlecenie_id", zlecenieId).order("wersja", { ascending: false }).limit(1);
    let wycenaId;
    if (wyc && wyc.length > 0) {
      wycenaId = wyc[0].id;
    } else {
      const { data: nowa } = await supabase.from("wyceny").insert({ zlecenie_id: zlecenieId, wersja: 1 }).select().single();
      wycenaId = nowa.id;
    }
    const { count } = await supabase.from("wycena_pozycje").select("id", { count: "exact", head: true }).eq("wycena_id", wycenaId);
    const wiersze = wynik.map((p, i) => ({
      wycena_id: wycenaId,
      etap: kalk.etap,
      nazwa: p.nazwa,
      ilosc: parseFloat(p.ilosc) || 0,
      jednostka: p.jednostka,
      cena_jednostkowa: parseFloat(p.cena) || 0,
      typ: "material",
      kolejnosc: (count || 0) + i,
    }));
    await supabase.from("wycena_pozycje").insert(wiersze);
    setZapisywanie(false);
    router.push(`/wyceny/${wycenaId}`);
  }

  const opisDanych = opisParametrow(par);
  const pow = powierzchniaZabudowy(par);

  return (
    <div>
      {/* Pasek z przełącznikiem kalkulatorów */}
      <div className="bg-white border-b border-line">
        <button type="button" onClick={() => setMenuOtwarte(v => !v)}
          className="w-full px-5 pt-5 pb-3 flex items-center justify-between text-left">
          <div>
            <div className="text-xl font-bold">{aktywnyTryb.nazwa}</div>
            <div className="text-xs text-muted">{aktywnyTryb.opis}</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`w-5 h-5 text-muted transition-transform ${menuOtwarte ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {menuOtwarte && (
          <div className="px-4 pb-3">
            {TRYBY.map(t => (
              <button type="button" key={t.id} onClick={() => zmienTryb(t.id)}
                className={`w-full text-left rounded-xl2 px-4 py-3 mb-2 ${t.id === tryb ? "bg-accentsoft" : "bg-bg"}`}>
                <div className={`text-sm font-semibold ${t.id === tryb ? "text-accent" : ""}`}>{t.nazwa}</div>
                <div className="text-xs text-muted">{t.opis}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        {brakKolumny && (
          <div className="text-xs rounded-lg p-3 mb-3 bg-status-redBg text-status-redFg">
            Dane budynku nie są zapisywane przy zleceniu. Uruchom w Supabase plik <b>migracja-parametry.sql</b>, żeby kalkulator instalacyjny mógł korzystać z wymiarów z kalkulatora materiałowego.
          </div>
        )}

        {krok === "formularz" && (
          <form onSubmit={oblicz}>
            {tryb === "materialowy" && (
              <>
                <div className="text-xs text-muted mb-1.5">METODA BUDOWY</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {METODY.map(m => (
                    <button type="button" key={m.id} onClick={() => zmienMetode(m.id)}
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold ${m.id === metoda ? "bg-accent text-white" : "bg-white text-muted"}`}>
                      {m.nazwa}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="text-xs text-muted mb-1.5">{tryb === "materialowy" ? "ETAP" : "INSTALACJA"}</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {dostepne.map(k => (
                <button type="button" key={k.id} onClick={() => przygotuj(k, par)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold ${k.id === kalk.id ? "bg-ink text-white" : "bg-white text-muted"}`}>
                  {k.nazwa}
                </button>
              ))}
            </div>

            <label className="block text-xs text-muted mb-1">
              {tryb === "instalacyjny" ? "Zlecenie (stąd pobieram dane budynku)" : "Zlecenie (zapamiętam przy nim dane budynku)"}
            </label>
            <select value={zlecenieId} onChange={e => zmienZlecenie(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm bg-white">
              <option value="">— wybierz zlecenie —</option>
              {zlecenia.map(z => <option key={z.id} value={z.id}>{z.nazwa}</option>)}
            </select>

            {tryb === "instalacyjny" && (
              <div className="text-xs rounded-lg p-3 mb-4 bg-accentsoft text-ink">
                {!zlecenieId && "Wybierz zlecenie, żeby pobrać wymiary budynku z kalkulatora materiałowego."}
                {zlecenieId && opisDanych && (
                  <>
                    <b>Dane z kalkulatora materiałowego:</b> {opisDanych}.
                    {pow && kalk.domyslne && <> Wartości początkowe wyliczono z zabudowy {pow} m² (jedna kondygnacja) — popraw przy kilku kondygnacjach.</>}
                  </>
                )}
                {zlecenieId && !opisDanych && "Brak danych budynku dla tego zlecenia. Policz najpierw np. więźbę lub ściany w kalkulatorze materiałowym albo wpisz wartości ręcznie."}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-2">
              {kalk.pola.map(p => (
                <div key={p.id}>
                  <label className="block text-xs text-muted mb-1">{p.label}</label>
                  <input value={wartosci[p.id] ?? ""} onChange={e => setWartosci(w => ({ ...w, [p.id]: e.target.value }))}
                    type={p.tekst ? "text" : "number"} step="any" required
                    className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-muted mb-1">Zapas na docinki (%)</label>
                <input value={zapas} onChange={e => setZapas(e.target.value)} type="number" step="1"
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <p className="text-xs text-muted mb-4">
              {kalk.uwaga}
              {tryb === "materialowy" && " Kalkulator liczy wyłącznie ilości materiału — nie projektuje i nie sprawdza konstrukcji."}
            </p>
            <button type="submit" className="w-full bg-accent text-white rounded-xl2 py-3 font-semibold text-sm">
              Oblicz ilości
            </button>
          </form>
        )}

        {krok === "wynik" && (
          <div>
            <div className="text-sm font-semibold mb-0.5">{kalk.nazwa}</div>
            <div className="text-xs text-muted mb-3">Wynik do zatwierdzenia — popraw ilości i wpisz ceny</div>
            {wynik.map(p => (
              <div key={p.id} className="bg-white rounded-xl2 p-3.5 mb-2.5">
                <div className="font-semibold text-sm mb-1">{p.nazwa}</div>
                <div className="text-xs text-muted mb-2">
                  netto {p.iloscNetto} {p.jednostka}{p.bezZapasu ? " (bez zapasu)" : ""}
                </div>
                <div className="flex gap-2 items-center">
                  <input value={p.ilosc} onChange={e => zmienWynik(p.id, "ilosc", e.target.value)} type="number" step="any"
                    className="w-24 border border-line rounded-lg px-2 py-1.5 text-sm" />
                  <span className="text-sm text-muted">{p.jednostka}</span>
                  <input value={p.cena} onChange={e => zmienWynik(p.id, "cena", e.target.value)} type="number" step="0.01" placeholder="cena/j."
                    className="flex-1 border border-line rounded-lg px-2 py-1.5 text-sm" />
                  <span className="text-sm text-muted">zł</span>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setKrok("formularz")} className="flex-1 border border-line rounded-xl2 py-3 text-sm font-semibold">
                Popraw
              </button>
              <button onClick={dodajDoWyceny} disabled={zapisywanie}
                className="flex-1 bg-accent text-white rounded-xl2 py-3 text-sm font-semibold disabled:opacity-60">
                {zapisywanie ? "Zapisywanie…" : "Dodaj do wyceny"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
