"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

const statusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  w_toku: "bg-status-blueBg text-status-blueFg",
  wyslane: "bg-status-blueBg text-status-blueFg",
  zatwierdzone: "bg-status-greenBg text-status-greenFg",
  problem: "bg-status-redBg text-status-redFg",
  zakonczone: "bg-status-greenBg text-status-greenFg",
};
const statusyLista = ["szkic", "w_toku", "wyslane", "zatwierdzone", "problem", "zakonczone"];

const wycenaStatusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  wyslana: "bg-status-blueBg text-status-blueFg",
  zaakceptowana: "bg-status-greenBg text-status-greenFg",
  odrzucona: "bg-status-redBg text-status-redFg",
};

export default function KartaZlecenia() {
  const { id } = useParams();
  const router = useRouter();
  const [zlecenie, setZlecenie] = useState(null);
  const [wyceny, setWyceny] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);

  async function pobierz() {
    const { data: z } = await supabase.from("zlecenia").select("*").eq("id", id).single();
    setZlecenie(z);
    const { data: w } = await supabase.from("wyceny").select("*").eq("zlecenie_id", id).order("wersja", { ascending: false });
    setWyceny(w || []);
    setLadowanie(false);
  }
  useEffect(() => { if (id) pobierz(); }, [id]);

  async function zmienStatus(nowyStatus) {
    await supabase.from("zlecenia").update({ status: nowyStatus }).eq("id", id);
    setZlecenie(z => ({ ...z, status: nowyStatus }));
  }

  async function nowaWycena() {
    const kolejnaWersja = wyceny.length > 0 ? Math.max(...wyceny.map(w => w.wersja)) + 1 : 1;
    const { data, error } = await supabase.from("wyceny")
      .insert({ zlecenie_id: id, wersja: kolejnaWersja })
      .select().single();
    if (!error) router.push(`/wyceny/${data.id}`);
  }

  if (ladowanie) return <div className="p-5 text-muted">Ładowanie…</div>;
  if (!zlecenie) return <div className="p-5 text-muted">Nie znaleziono zlecenia.</div>;

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <Link href="/zlecenia" className="text-xs text-muted">&larr; Zlecenia</Link>
        <h1 className="text-xl font-bold mt-1">{zlecenie.nazwa}</h1>
        <div className="text-sm text-muted">{zlecenie.adres || "Brak adresu"}</div>
      </div>

      <div className="p-4">
        <div className="text-xs text-muted mb-2">STATUS</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {statusyLista.map(s => (
            <button key={s} onClick={() => zmienStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${s === zlecenie.status ? (statusStyl[s] + " ring-2 ring-accent") : "bg-white text-muted"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-semibold">Wyceny</div>
          <button onClick={nowaWycena} className="text-xs bg-accent text-white rounded-lg px-3 py-1.5 font-semibold">
            + Nowa wycena
          </button>
        </div>
        {wyceny.length === 0 && <div className="text-sm text-muted mb-4">Brak wycen — dodaj pierwszą.</div>}
        {wyceny.map(w => (
          <Link key={w.id} href={`/wyceny/${w.id}`} className="block">
            <div className="bg-white rounded-xl2 p-3.5 mb-2.5 flex justify-between items-center">
              <div className="font-semibold text-sm">Wycena v{w.wersja}</div>
              <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${wycenaStatusStyl[w.status] || wycenaStatusStyl.szkic}`}>
                {w.status}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
