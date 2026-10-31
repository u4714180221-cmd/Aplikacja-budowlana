"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { METODY, KALKULATORY, zZapasem, zaokraglNetto } from "../../lib/kalkulatory";

function domyslneWartosci(kalk) {
  const w = {};
  kalk.pola.forEach(p => { w[p.id] = p.domyslna; });
  return w;
}

export default function Kalkulator() {
  const router = useRouter();
  const [zlecenia, setZlecenia] = useState([]);
  const [zlecenieId, setZlecenieId] = useState("");

  const [metoda, setMetoda] = useState("drewniana");
  const dostepne = KALKULATORY.filter(k => k.metody.includes(metoda));
  const [kalkId, setKalkId] = useState(dostepne[0].id);
  const kalk = KALKULATORY.find(k => k.id === kalkId);

  const [wartosci, setWartosci] = useState(domyslneWartosci(kalk));
  const [zapas, setZapas] = useState("10");
  const [krok, setKrok] = useState("formularz");
  const [wynik, setWynik] = useState([]);
  const [zapisywanie, setZapisywanie] = useState(false);

  useEffect(() => {
    supabase.from("zlecenia").select("id, nazwa").order("utworzono", { ascending: false })
      .then(({ data }) => setZlecenia(data || []));
  }, []);

  function zmienMetode(m) {
    setMetoda(m);
    const lista = KALKULATORY.filter(k => k.metody.includes(m));
    zmienKalkulator(lista[0].id);
  }

  function zmienKalkulator(id) {
    setKalkId(id);
    setWartosci(domyslneWartosci(KALKULATORY.find(k => k.id === id)));
    setKrok("formularz");
  }

  function oblicz(e) {
    e.preventDefault();
    const Z = parseFloat(zapas) || 0;
    const pozycje = kalk.oblicz(wartosci).map(p => ({
      id: p.id,
      nazwa: p.nazwa,
      jednostka: p.jednostka,
      iloscNetto: zaokraglNetto(p.netto, p.jednostka),
      ilosc: zZapasem(p.netto, Z, p.jednostka),
      cena: "",
    }));
    setWynik(pozycje);
    setKrok("wynik");
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

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <h1 className="text-xl font-bold">Kalkulator materiałowy</h1>
      </div>

      <div className="p-4">
        {krok === "formularz" && (
          <form onSubmit={oblicz}>
            <div className="text-xs text-muted mb-1.5">METODA BUDOWY</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {METODY.map(m => (
                <button type="button" key={m.id} onClick={() => zmienMetode(m.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold ${m.id === metoda ? "bg-accent text-white" : "bg-white text-muted"}`}>
                  {m.nazwa}
                </button>
              ))}
            </div>

            <div className="text-xs text-muted mb-1.5">ETAP</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {dostepne.map(k => (
                <button type="button" key={k.id} onClick={() => zmienKalkulator(k.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold ${k.id === kalkId ? "bg-ink text-white" : "bg-white text-muted"}`}>
                  {k.nazwa}
                </button>
              ))}
            </div>

            <label className="block text-xs text-muted mb-1">Zlecenie (wymagane przy dodaniu do wyceny)</label>
            <select value={zlecenieId} onChange={e => setZlecenieId(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mb-4 text-sm bg-white">
              <option value="">— wybierz zlecenie —</option>
              {zlecenia.map(z => <option key={z.id} value={z.id}>{z.nazwa}</option>)}
            </select>

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

            <p className="text-xs text-muted mb-4">{kalk.uwaga} Kalkulator liczy wyłącznie ilości materiału — nie projektuje i nie sprawdza konstrukcji.</p>
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
                <div className="text-xs text-muted mb-2">netto {p.iloscNetto} {p.jednostka}</div>
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
