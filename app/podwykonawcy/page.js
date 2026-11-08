"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

const statusNazwa = { ustalony: "Ustalony", w_trakcie: "W trakcie", odebrany: "Odebrany" };
const statusStyl = {
  ustalony: "bg-status-grayBg text-status-grayFg",
  w_trakcie: "bg-status-blueBg text-status-blueFg",
  odebrany: "bg-status-greenBg text-status-greenFg",
};
const kolejnosc = { w_trakcie: 0, ustalony: 1, odebrany: 2 };
const zl = (v) => (Number(v) || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";

export default function Podwykonawcy() {
  const [lista, setLista] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);

  useEffect(() => {
    supabase.from("zlecenie_podwykonawcy")
      .select("*, kontakty(nazwa, telefon), zlecenia(nazwa)")
      .then(({ data }) => {
        const posortowane = (data || []).sort((a, b) => (kolejnosc[a.status] ?? 9) - (kolejnosc[b.status] ?? 9));
        setLista(posortowane);
        setLadowanie(false);
      });
  }, []);

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <h1 className="text-2xl font-bold">Podwykonawcy</h1>
        <div className="text-xs text-muted">Przypisania do zleceń. Nowego dodasz z karty zlecenia.</div>
      </div>
      <div className="p-4">
        {ladowanie && <div className="text-sm text-muted">Ładowanie…</div>}
        {!ladowanie && lista.length === 0 && (
          <div className="text-sm text-muted">Brak przypisanych podwykonawców. Otwórz zlecenie i wybierz „+ Dodaj podwykonawcę”.</div>
        )}
        {lista.map(p => (
          <Link key={p.id} href={`/podwykonawcy/${p.id}`} className="block">
            <div className="bg-white rounded-xl2 p-3.5 mb-2.5">
              <div className="flex justify-between items-center mb-1">
                <div className="font-semibold text-sm">{p.kontakty?.nazwa || "Kontakt usunięty"}</div>
                <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyl[p.status] || statusStyl.ustalony}`}>
                  {statusNazwa[p.status] || p.status}
                </div>
              </div>
              <div className="text-xs text-muted">
                {p.zlecenia?.nazwa}{p.stawka ? ` · ${zl(p.stawka)}` : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
