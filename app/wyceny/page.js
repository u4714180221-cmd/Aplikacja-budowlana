"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const statusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  wyslana: "bg-status-blueBg text-status-blueFg",
  zaakceptowana: "bg-status-greenBg text-status-greenFg",
  odrzucona: "bg-status-redBg text-status-redFg",
};

export default function Wyceny() {
  const [lista, setLista] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);

  useEffect(() => {
    supabase.from("wyceny")
      .select("*, zlecenia(nazwa, adres)")
      .order("utworzono", { ascending: false })
      .then(({ data }) => { setLista(data || []); setLadowanie(false); });
  }, []);

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <h1 className="text-2xl font-bold">Wyceny</h1>
      </div>
      <div className="p-4">
        {ladowanie && <div className="text-sm text-muted">Ładowanie…</div>}
        {!ladowanie && lista.length === 0 && (
          <div className="text-sm text-muted">Brak wycen. Dodaj pierwszą z karty zlecenia.</div>
        )}
        {lista.map(w => (
          <Link key={w.id} href={`/wyceny/${w.id}`} className="block">
            <div className="bg-white rounded-xl2 p-3.5 mb-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm">{w.zlecenia?.nazwa || "Zlecenie usunięte"} — v{w.wersja}</div>
                <div className="text-xs text-muted">{w.zlecenia?.adres || "—"}</div>
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyl[w.status] || statusStyl.szkic}`}>
                {w.status}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
