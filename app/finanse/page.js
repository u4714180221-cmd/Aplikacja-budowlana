"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { pobierzWszystko } from "../../lib/pobierzWszystko";
import { liczFinanse, wybierzWycene, zl, kw, proc } from "../../lib/finanse";

const statusStyl = {
  szkic: "bg-status-grayBg text-status-grayFg",
  w_toku: "bg-status-blueBg text-status-blueFg",
  wyslane: "bg-status-blueBg text-status-blueFg",
  zatwierdzone: "bg-status-greenBg text-status-greenFg",
  problem: "bg-status-redBg text-status-redFg",
  zakonczone: "bg-status-greenBg text-status-greenFg",
};

export default function Finanse() {
  const [wiersze, setWiersze] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [filtr, setFiltr] = useState("aktywne");
  const [brakMigracji, setBrakMigracji] = useState(false);
  const [blad, setBlad] = useState("");

  useEffect(() => {
    (async () => {
      const [zlec, wyc, pozW, zam, pozZ, pp, wyd, wpl] = await Promise.all([
        pobierzWszystko("zlecenia", "id, nazwa, status"),
        pobierzWszystko("wyceny", "id, zlecenie_id, wersja, status, marza_procent"),
        pobierzWszystko("wycena_pozycje", "wycena_id, typ, ilosc, cena_jednostkowa"),
        pobierzWszystko("zamowienia", "id, zlecenie_id, status"),
        pobierzWszystko("zamowienie_pozycje", "zamowienie_id, ilosc, cena_jednostkowa"),
        pobierzWszystko("zlecenie_podwykonawcy", "zlecenie_id, stawka"),
        pobierzWszystko("wydatki", "zlecenie_id, kategoria, kwota"),
        pobierzWszystko("wplaty_klienta", "zlecenie_id, kwota"),
      ]);

      if ([zlec, wyc, pozW, zam, pozZ, pp].some(r => r.error)) {
        setBlad("Nie udało się pobrać danych. Odśwież stronę.");
        setLadowanie(false);
        return;
      }
      if (wyd.error || wpl.error) setBrakMigracji(true);

      const wydatki = wyd.data || [];
      const wplaty = wpl.data || [];

      const wynik = zlec.data.map(z => {
        const wycenyZ = wyc.data.filter(w => w.zlecenie_id === z.id);
        const wycena = wybierzWycene(wycenyZ);
        const zamZ = zam.data.filter(o => o.zlecenie_id === z.id);
        const idsZam = new Set(zamZ.map(o => o.id));
        const f = liczFinanse({
          wycena,
          pozycjeWyceny: wycena ? pozW.data.filter(p => p.wycena_id === wycena.id) : [],
          zamowienia: zamZ,
          pozycjeZamowien: pozZ.data.filter(p => idsZam.has(p.zamowienie_id)),
          przypisania: pp.data.filter(p => p.zlecenie_id === z.id),
          wydatki: wydatki.filter(w => w.zlecenie_id === z.id),
          wplaty: wplaty.filter(w => w.zlecenie_id === z.id),
        });
        return { zlecenie: z, f };
      });
      wynik.sort((a, b) => a.zlecenie.nazwa.localeCompare(b.zlecenie.nazwa, "pl"));
      setWiersze(wynik);
      setLadowanie(false);
    })();
  }, []);

  const widoczne = wiersze.filter(w => filtr === "wszystkie" || w.zlecenie.status !== "zakonczone");
  const razem = widoczne.reduce((s, { f }) => ({
    cena: s.cena + f.cena,
    koszt: s.koszt + f.kosztRazem,
    zysk: s.zysk + f.zysk,
    wplacono: s.wplacono + f.wplacono,
    naleznosc: s.naleznosc + f.naleznosc,
  }), { cena: 0, koszt: 0, zysk: 0, wplacono: 0, naleznosc: 0 });

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <h1 className="text-2xl font-bold">Finanse</h1>
        <div className="text-xs text-muted">Wynik wszystkich zleceń · kwoty bez VAT</div>
      </div>

      <div className="p-4">
        {blad && <div className="text-sm text-status-redFg mb-3">{blad}</div>}
        {brakMigracji && (
          <div className="text-xs rounded-lg p-3 mb-3 bg-status-redBg text-status-redFg">
            Brakuje aktualizacji bazy (wydatki i wpłaty klienta), więc raport pomija te dane. Uruchom w Supabase plik <b>migracja-finanse.sql</b>.
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {[["aktywne", "Aktywne"], ["wszystkie", "Wszystkie"]].map(([k, n]) => (
            <button key={k} onClick={() => setFiltr(k)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${k === filtr ? "bg-ink text-white" : "bg-white text-muted"}`}>
              {n}
            </button>
          ))}
        </div>

        {ladowanie && <div className="text-sm text-muted">Ładowanie…</div>}

        {!ladowanie && !blad && (
          <>
            <div className="bg-white rounded-xl2 p-4 mb-4">
              <div className="text-xs text-muted mb-2">RAZEM ({widoczne.length} {widoczne.length === 1 ? "zlecenie" : "zleceń"})</div>
              <div className="flex justify-between text-sm mb-1"><div className="text-muted">Wartość zleceń</div><div>{zl(razem.cena)}</div></div>
              <div className="flex justify-between text-sm mb-1"><div className="text-muted">Koszty dotychczas</div><div>{zl(razem.koszt)}</div></div>
              <div className={`flex justify-between text-base font-bold mt-2 ${razem.zysk < 0 ? "text-status-redFg" : "text-status-greenFg"}`}>
                <div>Zysk</div><div>{zl(razem.zysk)}</div>
              </div>
              <div className="flex justify-between text-sm mt-3 pt-3 border-t border-line">
                <div className="text-muted">Wpłacono przez klientów</div><div>{zl(razem.wplacono)}</div>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <div className="text-muted">Klienci jeszcze winni</div><div>{zl(razem.naleznosc)}</div>
              </div>
            </div>

            {widoczne.length === 0 && <div className="text-sm text-muted">Brak zleceń do pokazania.</div>}
            {widoczne.map(({ zlecenie: z, f }) => {
              const przekroczono = f.wykorzystanie !== null && f.wykorzystanie > 100;
              return (
                <Link key={z.id} href={`/zlecenia/${z.id}/finanse`} className="block">
                  <div className="bg-white rounded-xl2 p-3.5 mb-2.5">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold text-sm">{z.nazwa}</div>
                      <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyl[z.status] || statusStyl.szkic}`}>
                        {z.status.replace("_", " ")}
                      </div>
                    </div>
                    {!f.maWycene && <div className="text-xs text-muted mb-1">Brak wyceny</div>}
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div><div className="text-muted">Cena</div><div>{kw(f.cena)}</div></div>
                      <div><div className="text-muted">Koszty</div><div>{kw(f.kosztRazem)}</div></div>
                      <div>
                        <div className="text-muted">Zysk</div>
                        <div className={`font-semibold ${f.zysk < 0 ? "text-status-redFg" : "text-status-greenFg"}`}>{kw(f.zysk)}</div>
                      </div>
                    </div>
                    {f.wykorzystanie !== null && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-line overflow-hidden">
                          <div className={`h-full ${przekroczono ? "bg-status-redFg" : "bg-accent"}`}
                            style={{ width: `${Math.min(100, f.wykorzystanie)}%` }} />
                        </div>
                        <div className={`text-[11px] mt-1 ${przekroczono ? "text-status-redFg font-semibold" : "text-muted"}`}>
                          {proc(f.wykorzystanie)} planowanego kosztu{przekroczono ? " — przekroczono" : ""}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
