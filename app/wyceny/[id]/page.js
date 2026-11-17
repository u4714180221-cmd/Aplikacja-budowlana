"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { STAWKI_VAT, nazwaWyceny, stawkaVat, sumyWyceny } from "../../../lib/wyceny";
import { zl } from "../../../lib/finanse";

const JEDNOSTKI = ["mb", "m2", "m3", "szt", "kg", "kpl"];
const BRAK_MIGRACJI = "Nie udało się zapisać. Prawdopodobnie brakuje aktualizacji bazy — uruchom w Supabase plik migracja-wyceny.sql.";

export default function EdytorWyceny() {
  const { id } = useParams();
  const router = useRouter();
  const [wycena, setWycena] = useState(null);
  const [zlecenie, setZlecenie] = useState(null);
  const [pozycje, setPozycje] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [pokazForm, setPokazForm] = useState(false);
  const [blad, setBlad] = useState("");
  const [nazwaInput, setNazwaInput] = useState("");

  const [etap, setEtap] = useState("");
  const [nazwa, setNazwa] = useState("");
  const [ilosc, setIlosc] = useState("");
  const [jednostka, setJednostka] = useState("mb");
  const [cena, setCena] = useState("");
  const [typ, setTyp] = useState("material");

  async function pobierz() {
    const { data: w } = await supabase.from("wyceny").select("*").eq("id", id).single();
    setWycena(w);
    if (w) {
      setNazwaInput(w.nazwa || "");
      const { data: z } = await supabase.from("zlecenia").select("nazwa, adres").eq("id", w.zlecenie_id).single();
      setZlecenie(z);
    }
    const { data: p } = await supabase.from("wycena_pozycje").select("*").eq("wycena_id", id).order("kolejnosc");
    setPozycje(p || []);
    setLadowanie(false);
  }
  useEffect(() => { if (id) pobierz(); }, [id]);

  async function zapiszNazwe() {
    const nowa = nazwaInput.trim();
    if (nowa === (wycena.nazwa || "")) return;
    const { error } = await supabase.from("wyceny").update({ nazwa: nowa || null }).eq("id", id);
    if (error) { setBlad(BRAK_MIGRACJI); setNazwaInput(wycena.nazwa || ""); return; }
    setBlad("");
    setWycena(w => ({ ...w, nazwa: nowa || null }));
  }

  async function dodajPozycje(e) {
    e.preventDefault();
    if (!nazwa || !ilosc || !cena) return;
    const { error } = await supabase.from("wycena_pozycje").insert({
      wycena_id: id, etap: etap || "Pozostałe", nazwa,
      ilosc: parseFloat(ilosc), jednostka, cena_jednostkowa: parseFloat(cena), typ,
      kolejnosc: pozycje.length,
    });
    if (error) { setBlad("Nie udało się dodać pozycji: " + error.message); return; }
    setBlad("");
    setNazwa(""); setIlosc(""); setCena(""); setPokazForm(false);
    pobierz();
  }

  async function usunPozycje(p) {
    if (!window.confirm(`Usunąć pozycję „${p.nazwa}”?`)) return;
    const { error } = await supabase.from("wycena_pozycje").delete().eq("id", p.id);
    if (error) { setBlad("Nie udało się usunąć pozycji: " + error.message); return; }
    setBlad("");
    pobierz();
  }

  async function usunEtap(nazwaEtapu, lista) {
    if (!window.confirm(`Usunąć cały etap „${nazwaEtapu}” razem z ${lista.length} poz.?`)) return;
    const { error } = await supabase.from("wycena_pozycje").delete().in("id", lista.map(p => p.id));
    if (error) { setBlad("Nie udało się usunąć etapu: " + error.message); return; }
    setBlad("");
    pobierz();
  }

  async function usunWycene() {
    if (!window.confirm(`Usunąć całą wycenę „${nazwaWyceny(wycena)}” razem ze wszystkimi pozycjami? Tego nie można cofnąć.`)) return;
    const r1 = await supabase.from("wycena_pozycje").delete().eq("wycena_id", id);
    if (r1.error) { setBlad("Nie udało się usunąć pozycji wyceny: " + r1.error.message); return; }
    const r2 = await supabase.from("wyceny").delete().eq("id", id);
    if (r2.error) { setBlad("Nie udało się usunąć wyceny: " + r2.error.message); return; }
    router.push(`/zlecenia/${wycena.zlecenie_id}`);
  }

  async function zmienMarze(wartosc) {
    const liczba = parseFloat(wartosc) || 0;
    setWycena(w => ({ ...w, marza_procent: liczba }));
    await supabase.from("wyceny").update({ marza_procent: liczba }).eq("id", id);
  }

  async function zmienVat(v) {
    const { error } = await supabase.from("wyceny").update({ stawka_vat: v }).eq("id", id);
    if (error) { setBlad(BRAK_MIGRACJI); return; }
    setBlad("");
    setWycena(w => ({ ...w, stawka_vat: v }));
  }

  async function zmienStatus(nowyStatus) {
    await supabase.from("wyceny").update({ status: nowyStatus }).eq("id", id);
    setWycena(w => ({ ...w, status: nowyStatus }));
  }

  if (ladowanie) return <div className="p-5 text-muted">Ładowanie…</div>;
  if (!wycena) return <div className="p-5 text-muted">Nie znaleziono wyceny.</div>;

  const koszt = pozycje.reduce((s, p) => s + p.ilosc * p.cena_jednostkowa, 0);
  const vatProc = stawkaVat(wycena);
  const sumy = sumyWyceny({ koszt, marzaProc: wycena.marza_procent ?? 15, vatProc });

  const etapNazwa = (p) => p.etap || "Pozostałe";
  const etapy = [...new Set(pozycje.map(etapNazwa))];

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <Link href={`/zlecenia/${wycena.zlecenie_id}`} className="text-xs text-muted">&larr; {zlecenie?.nazwa}</Link>
        <input value={nazwaInput} onChange={e => setNazwaInput(e.target.value)} onBlur={zapiszNazwe}
          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
          placeholder={`Wycena v${wycena.wersja}`} aria-label="Nazwa wyceny"
          className="w-full mt-1 text-xl font-bold bg-transparent border-b border-dashed border-line focus:outline-none focus:border-accent" />
        <div className="text-[11px] text-muted mt-1">Dotknij nazwy, żeby ją zmienić · wersja {wycena.wersja}</div>
      </div>

      <div className="p-4">
        {blad && <div className="text-xs rounded-lg p-3 mb-3 bg-status-redBg text-status-redFg">{blad}</div>}

        {etapy.length === 0 && <div className="text-sm text-muted mb-3">Brak pozycji — dodaj pierwszą.</div>}
        {etapy.map(et => {
          const lista = pozycje.filter(p => etapNazwa(p) === et);
          return (
            <div key={et} className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-muted uppercase">{et}</div>
                <button onClick={() => usunEtap(et, lista)} className="text-status-redFg text-[11px] py-1">Usuń etap</button>
              </div>
              {lista.map(p => (
                <div key={p.id} className="bg-white rounded-xl2 p-3 mb-2 flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{p.nazwa}</div>
                    <div className="text-xs text-muted">
                      {p.ilosc} {p.jednostka} × {p.cena_jednostkowa.toFixed(2)} zł · {p.typ === "robocizna" ? "robocizna" : "materiał"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pl-2">
                    <div className="font-semibold text-sm whitespace-nowrap">{(p.ilosc * p.cena_jednostkowa).toFixed(2)} zł</div>
                    <button onClick={() => usunPozycje(p)} aria-label={`Usuń pozycję ${p.nazwa}`}
                      className="w-9 h-9 flex items-center justify-center text-status-redFg rounded-lg">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {!pokazForm ? (
          <button onClick={() => setPokazForm(true)} className="w-full bg-white border border-line rounded-xl2 py-3 text-sm font-semibold text-accent mb-4">
            + Dodaj pozycję
          </button>
        ) : (
          <form onSubmit={dodajPozycje} className="bg-white rounded-xl2 p-4 border border-line mb-4">
            <input value={etap} onChange={e => setEtap(e.target.value)} placeholder="Etap (np. Szkielet i więźba)"
              className="w-full border border-line rounded-lg px-3 py-2 mb-2 text-sm" />
            <input value={nazwa} onChange={e => setNazwa(e.target.value)} placeholder="Nazwa pozycji" required
              className="w-full border border-line rounded-lg px-3 py-2 mb-2 text-sm" />
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input value={ilosc} onChange={e => setIlosc(e.target.value)} type="number" step="0.01" placeholder="Ilość" required
                className="border border-line rounded-lg px-2 py-2 text-sm" />
              <select value={jednostka} onChange={e => setJednostka(e.target.value)} className="border border-line rounded-lg px-2 py-2 text-sm">
                {JEDNOSTKI.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <input value={cena} onChange={e => setCena(e.target.value)} type="number" step="0.01" placeholder="Cena netto/j." required
                className="border border-line rounded-lg px-2 py-2 text-sm" />
            </div>
            <select value={typ} onChange={e => setTyp(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm">
              <option value="material">Materiał</option>
              <option value="robocizna">Robocizna</option>
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPokazForm(false)} className="flex-1 border border-line rounded-lg py-2.5 text-sm font-semibold">Anuluj</button>
              <button type="submit" className="flex-1 bg-accent text-white rounded-lg py-2.5 text-sm font-semibold">Dodaj</button>
            </div>
          </form>
        )}

        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-muted">Status wyceny:</span>
          <select value={wycena.status} onChange={e => zmienStatus(e.target.value)} className="text-xs border border-line rounded-lg px-2 py-1">
            <option value="szkic">szkic</option>
            <option value="wyslana">wyslana</option>
            <option value="zaakceptowana">zaakceptowana</option>
            <option value="odrzucona">odrzucona</option>
          </select>
        </div>

        <button onClick={usunWycene} className="w-full text-status-redFg text-xs py-2">
          Usuń całą wycenę
        </button>
      </div>

      <div className="bg-white border-t border-line p-4">
        <div className="flex justify-between text-sm text-muted"><div>Suma pozycji (koszt netto)</div><div>{zl(sumy.koszt)}</div></div>
        <div className="flex justify-between text-sm text-muted items-center mt-1">
          <div>Marża
            <input type="number" value={wycena.marza_procent ?? 15} onChange={e => zmienMarze(e.target.value)}
              className="w-14 border border-line rounded px-1 py-0.5 ml-2 text-xs" />%
          </div>
          <div>{zl(sumy.marza)}</div>
        </div>
        <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-line">
          <div>Cena netto</div><div>{zl(sumy.netto)}</div>
        </div>
        <div className="flex justify-between text-sm text-muted items-center mt-2">
          <div className="flex items-center gap-2">
            <span>VAT</span>
            {STAWKI_VAT.map(v => (
              <button key={v} onClick={() => zmienVat(v)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${v === vatProc ? "bg-accent text-white" : "bg-bg text-muted"}`}>
                {v}%
              </button>
            ))}
          </div>
          <div>{zl(sumy.vat)}</div>
        </div>
        <div className="flex justify-between text-lg font-bold mt-2"><div>Razem brutto</div><div>{zl(sumy.brutto)}</div></div>
        <button disabled className="w-full mt-3 bg-gray-200 text-gray-400 rounded-xl2 py-3 font-semibold text-sm">
          Eksport do PDF — wkrótce
        </button>
      </div>
    </div>
  );
}
