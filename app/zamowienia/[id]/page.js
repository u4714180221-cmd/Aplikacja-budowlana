"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

const statusyLista = ["szkic", "wyslane", "potwierdzone", "dostarczone"];
const statusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  wyslane: "bg-status-blueBg text-status-blueFg",
  potwierdzone: "bg-status-greenBg text-status-greenFg",
  dostarczone: "bg-status-greenBg text-status-greenFg",
};

export default function KartaZamowienia() {
  const { id } = useParams();
  const [zamowienie, setZamowienie] = useState(null);
  const [dostawca, setDostawca] = useState(null);
  const [zlecenie, setZlecenie] = useState(null);
  const [pozycje, setPozycje] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);

  const [pokazForm, setPokazForm] = useState(false);
  const [nazwa, setNazwa] = useState("");
  const [ilosc, setIlosc] = useState("");
  const [jednostka, setJednostka] = useState("szt");
  const [cena, setCena] = useState("");

  const [pokazImport, setPokazImport] = useState(false);
  const [wyceny, setWyceny] = useState([]);
  const [wycenaId, setWycenaId] = useState("");
  const [pozycjeWyceny, setPozycjeWyceny] = useState([]);
  const [zaznaczone, setZaznaczone] = useState({});

  async function pobierz() {
    const { data: z } = await supabase.from("zamowienia").select("*").eq("id", id).single();
    setZamowienie(z);
    if (z) {
      const { data: d } = await supabase.from("kontakty").select("nazwa, telefon").eq("id", z.dostawca_id).single();
      setDostawca(d);
      const { data: zl } = await supabase.from("zlecenia").select("id, nazwa").eq("id", z.zlecenie_id).single();
      setZlecenie(zl);
      const { data: w } = await supabase.from("wyceny").select("id, wersja").eq("zlecenie_id", z.zlecenie_id).order("wersja", { ascending: false });
      setWyceny(w || []);
    }
    const { data: p } = await supabase.from("zamowienie_pozycje").select("*").eq("zamowienie_id", id);
    setPozycje(p || []);
    setLadowanie(false);
  }
  useEffect(() => { if (id) pobierz(); }, [id]);

  async function dodajPozycje(e) {
    e.preventDefault();
    if (!nazwa || !ilosc) return;
    await supabase.from("zamowienie_pozycje").insert({
      zamowienie_id: id, nazwa, ilosc: parseFloat(ilosc), jednostka, cena_jednostkowa: parseFloat(cena) || null,
    });
    setNazwa(""); setIlosc(""); setCena(""); setPokazForm(false);
    pobierz();
  }

  async function usunPozycje(pid) {
    await supabase.from("zamowienie_pozycje").delete().eq("id", pid);
    pobierz();
  }

  async function wczytajPozycjeWyceny(wid) {
    setWycenaId(wid);
    setZaznaczone({});
    if (!wid) { setPozycjeWyceny([]); return; }
    const { data } = await supabase.from("wycena_pozycje").select("*").eq("wycena_id", wid).eq("typ", "material");
    setPozycjeWyceny(data || []);
  }

  async function importuj() {
    const doImportu = pozycjeWyceny.filter(p => zaznaczone[p.id]);
    if (doImportu.length === 0) return;
    const wiersze = doImportu.map(p => ({
      zamowienie_id: id, nazwa: p.nazwa, ilosc: p.ilosc, jednostka: p.jednostka, cena_jednostkowa: p.cena_jednostkowa,
    }));
    await supabase.from("zamowienie_pozycje").insert(wiersze);
    setPokazImport(false); setWycenaId(""); setPozycjeWyceny([]); setZaznaczone({});
    pobierz();
  }

  async function zmienStatus(s) {
    await supabase.from("zamowienia").update({ status: s }).eq("id", id);
    setZamowienie(z => ({ ...z, status: s }));
  }

  if (ladowanie) return <div className="p-5 text-muted">Ładowanie…</div>;
  if (!zamowienie) return <div className="p-5 text-muted">Nie znaleziono zamówienia.</div>;

  const suma = pozycje.reduce((s, p) => s + p.ilosc * (p.cena_jednostkowa || 0), 0);

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <Link href="/zamowienia" className="text-xs text-muted">&larr; Zamówienia</Link>
        <h1 className="text-xl font-bold mt-1">{dostawca?.nazwa || "Dostawca"}</h1>
        <div className="text-sm text-muted">{zlecenie?.nazwa} {dostawca?.telefon ? `· ${dostawca.telefon}` : ""}</div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-5">
          {statusyLista.map(s => (
            <button key={s} onClick={() => zmienStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${s === zamowienie.status ? (statusStyl[s] + " ring-2 ring-accent") : "bg-white text-muted"}`}>
              {s}
            </button>
          ))}
        </div>

        {pozycje.length === 0 && <div className="text-sm text-muted mb-3">Brak pozycji.</div>}
        {pozycje.map(p => (
          <div key={p.id} className="bg-white rounded-xl2 p-3.5 mb-2.5 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{p.nazwa}</div>
              <div className="text-xs text-muted">{p.ilosc} {p.jednostka}{p.cena_jednostkowa ? ` · ${p.cena_jednostkowa.toFixed(2)} zł/j.` : ""}</div>
            </div>
            <button onClick={() => usunPozycje(p.id)} className="text-status-redFg text-xs">Usuń</button>
          </div>
        ))}

        {suma > 0 && (
          <div className="flex justify-between text-sm font-semibold bg-white rounded-xl2 p-3.5 mb-4">
            <div>Suma (wg podanych cen)</div><div>{suma.toFixed(2)} zł</div>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <button onClick={() => { setPokazForm(v => !v); setPokazImport(false); }}
            className="flex-1 bg-white border border-line rounded-xl2 py-2.5 text-sm font-semibold text-accent">
            + Dodaj ręcznie
          </button>
          <button onClick={() => { setPokazImport(v => !v); setPokazForm(false); }}
            className="flex-1 bg-white border border-line rounded-xl2 py-2.5 text-sm font-semibold text-accent">
            Importuj z wyceny
          </button>
        </div>

        {pokazForm && (
          <form onSubmit={dodajPozycje} className="bg-white rounded-xl2 p-4 border border-line mb-4 mt-2">
            <input value={nazwa} onChange={e => setNazwa(e.target.value)} placeholder="Nazwa materiału" required
              className="w-full border border-line rounded-lg px-3 py-2 mb-2 text-sm" />
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input value={ilosc} onChange={e => setIlosc(e.target.value)} type="number" step="0.01" placeholder="Ilość" required
                className="border border-line rounded-lg px-2 py-2 text-sm" />
              <input value={jednostka} onChange={e => setJednostka(e.target.value)} placeholder="j."
                className="border border-line rounded-lg px-2 py-2 text-sm" />
              <input value={cena} onChange={e => setCena(e.target.value)} type="number" step="0.01" placeholder="cena/j."
                className="border border-line rounded-lg px-2 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold">Dodaj</button>
          </form>
        )}

        {pokazImport && (
          <div className="bg-white rounded-xl2 p-4 border border-line mb-4 mt-2">
            <label className="block text-xs text-muted mb-1">Wybierz wycenę</label>
            <select value={wycenaId} onChange={e => wczytajPozycjeWyceny(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm bg-white">
              <option value="">— wybierz —</option>
              {wyceny.map(w => <option key={w.id} value={w.id}>Wycena v{w.wersja}</option>)}
            </select>
            {pozycjeWyceny.length === 0 && wycenaId && <p className="text-xs text-muted mb-2">Brak pozycji materiałowych w tej wycenie.</p>}
            {pozycjeWyceny.map(p => (
              <label key={p.id} className="flex items-center gap-2 mb-2 text-sm">
                <input type="checkbox" checked={!!zaznaczone[p.id]}
                  onChange={e => setZaznaczone(z => ({ ...z, [p.id]: e.target.checked }))} />
                {p.nazwa} — {p.ilosc} {p.jednostka}
              </label>
            ))}
            {pozycjeWyceny.length > 0 && (
              <button onClick={importuj} className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold mt-2">
                Importuj zaznaczone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
