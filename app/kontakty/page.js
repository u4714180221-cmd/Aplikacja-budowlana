"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const tagStyl = {
  klient: "bg-accentsoft text-accent",
  dostawca: "bg-status-blueBg text-status-blueFg",
  podwykonawca: "bg-status-greenBg text-status-greenFg",
};

export default function Kontakty() {
  const [lista, setLista] = useState([]);
  const [pokazForm, setPokazForm] = useState(false);
  const [nazwa, setNazwa] = useState("");
  const [typ, setTyp] = useState("klient");
  const [telefon, setTelefon] = useState("");

  async function pobierz() {
    const { data } = await supabase.from("kontakty").select("*").order("nazwa");
    setLista(data || []);
  }
  useEffect(() => { pobierz(); }, []);

  async function dodaj(e) {
    e.preventDefault();
    if (!nazwa) return;
    await supabase.from("kontakty").insert({ nazwa, typ, telefon });
    setNazwa(""); setTelefon(""); setPokazForm(false);
    pobierz();
  }

  function inicjaly(n) {
    return n.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line flex justify-between items-center">
        <h1 className="text-2xl font-bold">Kontakty</h1>
        <button onClick={() => setPokazForm(v => !v)}
          className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center text-xl">+</button>
      </div>

      {pokazForm && (
        <form onSubmit={dodaj} className="p-4 bg-white m-4 rounded-xl2 border border-line">
          <input value={nazwa} onChange={e => setNazwa(e.target.value)} placeholder="Imię i nazwisko / firma"
            className="w-full border border-line rounded-lg px-3 py-2 mb-2" required />
          <select value={typ} onChange={e => setTyp(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 mb-2">
            <option value="klient">Klient</option>
            <option value="dostawca">Dostawca</option>
            <option value="podwykonawca">Podwykonawca</option>
          </select>
          <input value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="Telefon"
            className="w-full border border-line rounded-lg px-3 py-2 mb-3" />
          <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 font-semibold">Dodaj kontakt</button>
        </form>
      )}

      <div className="p-4">
        {lista.length === 0 && <div className="text-sm text-muted">Brak kontaktów.</div>}
        {lista.map(k => (
          <div key={k.id} className="bg-white rounded-xl2 p-3.5 mb-2.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accentsoft text-accent flex items-center justify-center font-bold text-sm flex-none">
              {inicjaly(k.nazwa)}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{k.nazwa}</div>
              <div className="text-xs text-muted">{k.telefon || "—"}</div>
            </div>
            <div className={`text-xs px-2 py-0.5 rounded-full ${tagStyl[k.typ]}`}>{k.typ}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
