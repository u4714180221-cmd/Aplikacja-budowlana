"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

const JEDNOSTKI = ["mb", "m2", "m3", "szt", "kg", "kpl"];

export default function EdytorWyceny() {
  const { id } = useParams();
  const [wycena, setWycena] = useState(null);
  const [zlecenie, setZlecenie] = useState(null);
  const [pozycje, setPozycje] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [pokazForm, setPokazForm] = useState(false);

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
      const { data: z } = await supabase.from("zlecenia").select("nazwa, adres").eq("id", w.zlecenie_id).single();
      setZlecenie(z);
    }
    const { data: p } = await supabase.from("wycena_pozycje").select("*").eq("wycena_id", id).order("kolejnosc");
    setPozycje(p || []);
    setLadowanie(false);
  }
  useEffect(() => { if (id) pobierz(); }, [id]);

  async function dodajPozycje(e) {
    e.preventDefault();
    if (!nazwa || !ilosc || !cena) return;
    await supabase.from("wycena_pozycje").insert({
      wycena_id: id, etap: etap || "Pozostałe", nazwa,
      ilosc: parseFloat(ilosc), jednostka, cena_jednostkowa: parseFloat(cena), typ,
      kolejnosc: pozycje.length,
    });
    setNazwa(""); setIlosc(""); setCena(""); setPokazForm(false);
    pobierz();
  }

  async function usunPozycje(pid) {
    await supabase.from("wycena_pozycje").delete().eq("id", pid);
    pobierz();
  }

  async function zmienMarze(wartosc) {
    const liczba = parseFloat(wartosc) || 0;
    setWycena(w => ({ ...w, marza_procent: liczba }));
    await supabase.from("wyceny").update({ marza_procent: liczba }).eq("id", id);
  }

  async function zmienStatus(nowyStatus) {
    await supabase.from("wyceny").update({ status: nowyStatus }).eq("id", id);
    setWycena(w => ({ ...w, status: nowyStatus }));
  }

  if (ladowanie) return <div className="p-5 text-muted">Ładowanie…</div>;
  if (!wycena) return <div className="p-5 text-muted">Nie znaleziono wyceny.</div>;

  const sumaNetto = pozycje.reduce((s, p) => s + p.ilosc * p.cena_jednostkowa, 0);
  const marza = sumaNetto * (wycena.marza_procent || 0) / 100;
  const brutto = sumaNetto + marza;

  const etapy = [...new Set(pozycje.map(p => p.etap))];

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <Link href={`/zlecenia/${wycena.zlecenie_id}`} className="text-xs text-muted">&larr; {zlecenie?.nazwa}</Link>
        <h1 className="text-xl font-bold mt-1">Wycena v{wycena.wersja}</h1>
      </div>

      <div className="p-4">
        {etapy.length === 0 && <div className="text-sm text-muted mb-3">Brak pozycji — dodaj pierwszą.</div>}
        {etapy.map(et => (
          <div key={et} className="mb-4">
            <div className="text-xs text-muted mb-2 uppercase">{et}</div>
            {pozycje.filter(p => p.etap === et).map(p => (
              <div key={p.id} className="bg-white rounded-xl2 p-3 mb-2 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{p.nazwa}</div>
                  <div className="text-xs text-muted">{p.ilosc} {p.jednostka} × {p.cena_jednostkowa.toFixed(2)} zł</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold">{(p.ilosc * p.cena_jednostkowa).toFixed(2)} zł</div>
                  <button onClick={() => usunPozycje(p.id)} className="text-status-redFg text-xs">Usuń</button>
                </div>
              </div>
            ))}
          </div>
        ))}

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
              <input value={cena} onChange={e => setCena(e.target.value)} type="number" step="0.01" placeholder="Cena/j." required
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

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted">Status wyceny:</span>
          <select value={wycena.status} onChange={e => zmienStatus(e.target.value)} className="text-xs border border-line rounded-lg px-2 py-1">
            <option value="szkic">szkic</option>
            <option value="wyslana">wyslana</option>
            <option value="zaakceptowana">zaakceptowana</option>
            <option value="odrzucona">odrzucona</option>
          </select>
        </div>
      </div>

      <div className="bg-white border-t border-line p-4">
        <div className="flex justify-between text-sm text-muted"><div>Suma netto</div><div>{sumaNetto.toFixed(2)} zł</div></div>
        <div className="flex justify-between text-sm text-muted items-center mt-1">
          <div>Marża
            <input type="number" value={wycena.marza_procent ?? 15} onChange={e => zmienMarze(e.target.value)}
              className="w-14 border border-line rounded px-1 py-0.5 ml-2 text-xs" />%
          </div>
          <div>{marza.toFixed(2)} zł</div>
        </div>
        <div className="flex justify-between text-lg font-bold mt-2"><div>Razem</div><div>{brutto.toFixed(2)} zł</div></div>
        <button disabled className="w-full mt-3 bg-gray-200 text-gray-400 rounded-xl2 py-3 font-semibold text-sm">
          Eksport do PDF — wkrótce
        </button>
      </div>
    </div>
  );
}
