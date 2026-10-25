"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const ZAPAS_DOMYSLNY = 10;

export default function Kalkulator() {
  const router = useRouter();
  const [zlecenia, setZlecenia] = useState([]);
  const [zlecenieId, setZlecenieId] = useState("");
  const [krok, setKrok] = useState("formularz"); // formularz | wynik

  const [szerokosc, setSzerokosc] = useState("8");
  const [dlugosc, setDlugosc] = useState("10");
  const [kat, setKat] = useState("30");
  const [rozstaw, setRozstaw] = useState("80");
  const [przekroj, setPrzekroj] = useState("8x16");
  const [zapas, setZapas] = useState(String(ZAPAS_DOMYSLNY));

  const [wynik, setWynik] = useState([]);
  const [zapisywanie, setZapisywanie] = useState(false);

  useEffect(() => {
    supabase.from("zlecenia").select("id, nazwa").order("utworzono", { ascending: false })
      .then(({ data }) => setZlecenia(data || []));
  }, []);

  function oblicz(e) {
    e.preventDefault();
    const S = parseFloat(szerokosc), D = parseFloat(dlugosc);
    const K = parseFloat(kat) * Math.PI / 180;
    const R = parseFloat(rozstaw);
    const Z = parseFloat(zapas) / 100;
    if (!S || !D || !K || !R) return;

    // Geometria dachu dwuspadowego
    const dlKrokwi = (S / 2) / Math.cos(K) + 0.3; // + okap 0.3 m
    const liczbaKrokwi = Math.ceil((D * 100) / R) + 1;
    const krokwieNetto = +(liczbaKrokwi * dlKrokwi).toFixed(1);

    const powDachu = +(2 * D * dlKrokwi).toFixed(1); // obie połacie
    const osbNaPlyte = 2.5 * 1.25; // m2 na płytę OSB
    const osbNetto = Math.ceil(powDachu / osbNaPlyte);

    const laczNaMb = 0.7; // łączniki ciesielskie na mb krokwi (norma orientacyjna)
    const laczNetto = Math.ceil(krokwieNetto * laczNaMb);

    const zZapasem = (v) => +(v * (1 + Z)).toFixed(1);

    setWynik([
      { id: "krokwie", nazwa: `Krokwie ${przekroj}`, iloscNetto: krokwieNetto, ilosc: zZapasem(krokwieNetto), jednostka: "mb", cena: "" },
      { id: "osb", nazwa: "Płyta OSB 18mm", iloscNetto: osbNetto, ilosc: Math.ceil(zZapasem(osbNetto)), jednostka: "szt", cena: "" },
      { id: "lacz", nazwa: "Łączniki ciesielskie", iloscNetto: laczNetto, ilosc: Math.ceil(zZapasem(laczNetto)), jednostka: "szt", cena: "" },
    ]);
    setKrok("wynik");
  }

  function zmienWynik(id, pole, wartosc) {
    setWynik(w => w.map(p => p.id === id ? { ...p, [pole]: wartosc } : p));
  }

  async function dodajDoWyceny() {
    if (!zlecenieId) { alert("Wybierz zlecenie."); return; }
    setZapisywanie(true);
    let { data: wyc } = await supabase.from("wyceny").select("*").eq("zlecenie_id", zlecenieId).order("wersja", { ascending: false }).limit(1);
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
      etap: "Szkielet i więźba (kalkulator)",
      nazwa: p.nazwa,
      ilosc: parseFloat(p.ilosc),
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
        <div className="text-xs text-muted">Szkielet drewniany · etap: więźba</div>
      </div>

      <div className="p-4">
        {krok === "formularz" && (
          <form onSubmit={oblicz}>
            <label className="block text-xs text-muted mb-1">Przypisz do zlecenia (opcjonalnie teraz, wymagane przy dodaniu do wyceny)</label>
            <select value={zlecenieId} onChange={e => setZlecenieId(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mb-4 text-sm bg-white">
              <option value="">— wybierz zlecenie —</option>
              {zlecenia.map(z => <option key={z.id} value={z.id}>{z.nazwa}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-xs text-muted mb-1">Szerokość budynku (m)</label>
                <input value={szerokosc} onChange={e => setSzerokosc(e.target.value)} type="number" step="0.1" required
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Długość budynku (m)</label>
                <input value={dlugosc} onChange={e => setDlugosc(e.target.value)} type="number" step="0.1" required
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Kąt dachu (°)</label>
                <input value={kat} onChange={e => setKat(e.target.value)} type="number" step="1" required
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Rozstaw krokwi (cm)</label>
                <input value={rozstaw} onChange={e => setRozstaw(e.target.value)} type="number" step="1" required
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Przekrój krokwi</label>
                <input value={przekroj} onChange={e => setPrzekroj(e.target.value)}
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm" placeholder="np. 8x16" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Zapas na docinki (%)</label>
                <input value={zapas} onChange={e => setZapas(e.target.value)} type="number" step="1"
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <p className="text-xs text-muted mb-4">
              Przekrój i rozstaw podajesz Ty lub Twój konstruktor — kalkulator liczy wyłącznie ilości materiału, nie dobiera nośności konstrukcji.
            </p>
            <button type="submit" className="w-full bg-accent text-white rounded-xl2 py-3 font-semibold text-sm">
              Oblicz ilości
            </button>
          </form>
        )}

        {krok === "wynik" && (
          <div>
            <div className="text-xs text-muted mb-3">WYNIK — do zatwierdzenia, możesz poprawić ilości i wpisać ceny</div>
            {wynik.map(p => (
              <div key={p.id} className="bg-white rounded-xl2 p-3.5 mb-2.5">
                <div className="font-semibold text-sm mb-1">{p.nazwa}</div>
                <div className="text-xs text-muted mb-2">netto {p.iloscNetto} {p.jednostka}</div>
                <div className="flex gap-2 items-center">
                  <input value={p.ilosc} onChange={e => zmienWynik(p.id, "ilosc", e.target.value)} type="number" step="0.1"
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
