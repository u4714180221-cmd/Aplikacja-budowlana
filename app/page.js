"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const skroty = [
  { href: "/zlecenia", label: "Zlecenia", d: "M5 6h14M5 12h14M5 18h9" },
  { href: "/wyceny", label: "Wyceny", d: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM8 8h8M8 13h8" },
  { href: "/kalkulator", label: "Kalkulator", d: "M5 3h14v18H5zM8 8h8M8 13h3M14 13h3M8 17h3M14 17h3" },
  { href: "/zamowienia", label: "Zamówienia", d: "M3 7h10v8H3zM13 10h4l4 3v2h-8z" },
  { href: "/kontakty", label: "Kontakty", d: "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6", circles: true },
];

const statusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  w_toku: "bg-status-blueBg text-status-blueFg",
  wyslane: "bg-status-blueBg text-status-blueFg",
  zatwierdzone: "bg-status-greenBg text-status-greenFg",
  problem: "bg-status-redBg text-status-redFg",
  zakonczone: "bg-status-greenBg text-status-greenFg",
};

export default function Pulpit() {
  const [zlecenia, setZlecenia] = useState([]);
  const [liczby, setLiczby] = useState({ wToku: 0, wyceny: 0, zamowienia: 0 });

  useEffect(() => {
    supabase.from("zlecenia").select("*").order("utworzono", { ascending: false }).limit(5)
      .then(({ data }) => setZlecenia(data || []));
    supabase.from("zlecenia").select("id", { count: "exact", head: true }).eq("status", "w_toku")
      .then(({ count }) => setLiczby(l => ({ ...l, wToku: count || 0 })));
    supabase.from("wyceny").select("id", { count: "exact", head: true }).eq("status", "wyslana")
      .then(({ count }) => setLiczby(l => ({ ...l, wyceny: count || 0 })));
    supabase.from("zamowienia").select("id", { count: "exact", head: true }).eq("status", "szkic")
      .then(({ count }) => setLiczby(l => ({ ...l, zamowienia: count || 0 })));
  }, []);

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <h1 className="text-2xl font-bold">Pulpit</h1>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="bg-white rounded-xl2 p-3.5"><div className="text-2xl font-bold">{liczby.wToku}</div><div className="text-xs text-muted">Zlecenia w toku</div></div>
          <div className="bg-white rounded-xl2 p-3.5"><div className="text-2xl font-bold">{liczby.wyceny}</div><div className="text-xs text-muted">Wyceny czekają</div></div>
          <div className="bg-white rounded-xl2 p-3.5"><div className="text-2xl font-bold">{liczby.zamowienia}</div><div className="text-xs text-muted">Zamówienia do wysłania</div></div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 mb-5">
          {skroty.map(s => (
            <Link key={s.href} href={s.href} className="flex flex-col items-center gap-1.5 text-ink">
              <div className="w-13 h-13 rounded-xl2 bg-white flex items-center justify-center text-accent" style={{ width: 52, height: 52 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  {s.circles && <circle cx="17" cy="9" r="2.3" />}
                  <path d={s.d} />
                </svg>
              </div>
              <span className="text-[11px] text-center">{s.label}</span>
            </Link>
          ))}
        </div>

        <div className="text-sm font-semibold mb-2.5">Ostatnie zlecenia</div>
        {zlecenia.length === 0 && <div className="text-sm text-muted">Brak zleceń — dodaj pierwsze w zakładce Zlecenia.</div>}
        {zlecenia.map(z => (
          <Link key={z.id} href="/zlecenia" className="block">
            <div className="bg-white rounded-xl2 p-3.5 mb-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm">{z.nazwa}</div>
                <div className="text-xs text-muted">{z.adres}</div>
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
