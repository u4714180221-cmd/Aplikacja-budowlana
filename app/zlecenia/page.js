"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const statusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  w_toku: "bg-status-blueBg text-status-blueFg",
  wyslane: "bg-status-blueBg text-status-blueFg",
  zatwierdzone: "bg-status-greenBg text-status-greenFg",
  problem: "bg-status-redBg text-status-redFg",
  zakonczone: "bg-status-greenBg text-status-greenFg",
};

export default function Zlecenia() {
  const [lista, setLista] = useState([]);
  const [pokazForm, setPokazForm] = useState(false);
  const [nazwa, setNazwa] = useState("");
  const [adres, setAdres] = useState("");

  async function pobierz() {
    const { data } = await supabase.from("zlecenia").select("*").order("utworzono", { ascending: false });
    setLista(data || []);
  }
  useEffect(() => { pobierz(); }, []);

  async function dodaj(e) {
    e.preventDefault();
    if (!nazwa) return;
    await supabase.from("zlecenia").insert({ nazwa, adres, status: "szkic" });
    setNazwa(""); setAdres(""); setPokazForm(false);
    pobierz();
  }

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line flex justify-between items-center">
        <h1 className="text-2xl font-bold">Zlecenia</h1>
        <button onClick={() => setPokazForm(v => !v)}
          className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center text-xl">+</button>
      </div>

      {pokazForm && (
        <form onSubmit={dodaj} className="p-4 bg-white m-4 rounded-xl2 border border-line">
          <input value={nazwa} onChange={e => setNazwa(e.target.value)} placeholder="Nazwa zlecenia (np. Dom Kowalski)"
            className="w-full border border-line rounded-lg px-3 py-2 mb-2" required />
          <input value={adres} onChange={e => setAdres(e.target.value)} placeholder="Adres"
            className="w-full border border-line rounded-lg px-3 py-2 mb-3" />
          <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 font-semibold">Dodaj zlecenie</button>
        </form>
      )}

      <div className="p-4">
        {lista.length === 0 && <div className="text-sm text-muted">Brak zleceń.</div>}
        {lista.map(z => (
          <Link key={z.id} href={`/zlecenia/${z.id}`} className="block">
            <div className="bg-white rounded-xl2 p-3.5 mb-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm">{z.nazwa}</div>
                <div className="text-xs text-muted">{z.adres || "—"}</div>
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyl[z.status] || statusStyl.szkic}`}>
                {z.status.replace("_", " ")}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
