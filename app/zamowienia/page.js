"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const statusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  wyslane: "bg-status-blueBg text-status-blueFg",
  potwierdzone: "bg-status-greenBg text-status-greenFg",
  dostarczone: "bg-status-greenBg text-status-greenFg",
};

export default function Zamowienia() {
  const router = useRouter();
  const [lista, setLista] = useState([]);
  const [zlecenia, setZlecenia] = useState([]);
  const [dostawcy, setDostawcy] = useState([]);
  const [pokazForm, setPokazForm] = useState(false);
  const [zlecenieId, setZlecenieId] = useState("");
  const [dostawcaId, setDostawcaId] = useState("");
  const [ladowanie, setLadowanie] = useState(true);

  async function pobierz() {
    const { data } = await supabase.from("zamowienia")
      .select("*, kontakty(nazwa), zlecenia(nazwa), zamowienie_pozycje(id)")
      .order("utworzono", { ascending: false });
    setLista(data || []);
    setLadowanie(false);
  }

  useEffect(() => {
    pobierz();
    supabase.from("zlecenia").select("id, nazwa").order("utworzono", { ascending: false })
      .then(({ data }) => setZlecenia(data || []));
    supabase.from("kontakty").select("id, nazwa").eq("typ", "dostawca").order("nazwa")
      .then(({ data }) => setDostawcy(data || []));
  }, []);

  async function utworz(e) {
    e.preventDefault();
    if (!zlecenieId || !dostawcaId) return;
    const { data, error } = await supabase.from("zamowienia")
      .insert({ zlecenie_id: zlecenieId, dostawca_id: dostawcaId })
      .select().single();
    if (!error) router.push(`/zamowienia/${data.id}`);
  }

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line flex justify-between items-center">
        <h1 className="text-2xl font-bold">Zamówienia</h1>
        <button onClick={() => setPokazForm(v => !v)}
          className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center text-xl">+</button>
      </div>

      {pokazForm && (
        <form onSubmit={utworz} className="p-4 bg-white m-4 rounded-xl2 border border-line">
          {dostawcy.length === 0 && (
            <p className="text-xs text-status-redFg mb-2">Brak dostawców w Kontaktach — dodaj dostawcę, zanim utworzysz zamówienie.</p>
          )}
          <label className="block text-xs text-muted mb-1">Zlecenie</label>
          <select value={zlecenieId} onChange={e => setZlecenieId(e.target.value)} required
            className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm bg-white">
            <option value="">— wybierz —</option>
            {zlecenia.map(z => <option key={z.id} value={z.id}>{z.nazwa}</option>)}
          </select>
          <label className="block text-xs text-muted mb-1">Dostawca</label>
          <select value={dostawcaId} onChange={e => setDostawcaId(e.target.value)} required
            className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm bg-white">
            <option value="">— wybierz —</option>
            {dostawcy.map(d => <option key={d.id} value={d.id}>{d.nazwa}</option>)}
          </select>
          <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 font-semibold text-sm">
            Utwórz zamówienie
          </button>
        </form>
      )}

      <div className="p-4">
        {ladowanie && <div className="text-sm text-muted">Ładowanie…</div>}
        {!ladowanie && lista.length === 0 && <div className="text-sm text-muted">Brak zamówień.</div>}
        {lista.map(z => (
          <Link key={z.id} href={`/zamowienia/${z.id}`} className="block">
            <div className="bg-white rounded-xl2 p-3.5 mb-2.5">
              <div className="flex justify-between items-center mb-1">
                <div className="font-semibold text-sm">{z.kontakty?.nazwa || "Dostawca usunięty"}</div>
                <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyl[z.status] || statusStyl.szkic}`}>
                  {z.status}
                </div>
              </div>
              <div className="text-xs text-muted">{z.zlecenia?.nazwa} · {z.zamowienie_pozycje?.length || 0} pozycji</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
