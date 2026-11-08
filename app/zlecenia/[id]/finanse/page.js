"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";
import {
  liczFinanse, zuzycieMaterialow, wybierzWycene,
  zl, kw, proc, KATEGORIE_WYDATKOW, nazwaKategorii, STATUS_ZUZYCIA,
} from "../../../../lib/finanse";

const dzis = () => new Date().toISOString().slice(0, 10);

const zuzycieStyl = {
  ok: "bg-status-greenBg text-status-greenFg",
  mniej: "bg-status-blueBg text-status-blueFg",
  nie_zamowiono: "bg-status-blueBg text-status-blueFg",
  wiecej: "bg-status-redBg text-status-redFg",
  poza_wycena: "bg-status-redBg text-status-redFg",
};

function Wiersz({ etykieta, plan, rzecz }) {
  const r = rzecz - plan;
  return (
    <div className="grid grid-cols-4 gap-1 text-xs py-2 border-b border-line last:border-0 items-center">
      <div className="text-muted">{etykieta}</div>
      <div className="text-right">{kw(plan)}</div>
      <div className="text-right">{kw(rzecz)}</div>
      <div className={`text-right font-semibold ${r > 0 ? "text-status-redFg" : "text-status-greenFg"}`}>
        {r > 0 ? "+" : ""}{kw(r)}
      </div>
    </div>
  );
}

export default function FinanseZlecenia() {
  const { id } = useParams();
  const [zlecenie, setZlecenie] = useState(null);
  const [wyceny, setWyceny] = useState([]);
  const [wycenaId, setWycenaId] = useState("");
  const [pozycjeW, setPozycjeW] = useState([]);
  const [zamowienia, setZamowienia] = useState([]);
  const [pozycjeZam, setPozycjeZam] = useState([]);
  const [przypisania, setPrzypisania] = useState([]);
  const [wydatki, setWydatki] = useState([]);
  const [wplaty, setWplaty] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [brakMigracji, setBrakMigracji] = useState(false);

  const [wKategoria, setWKategoria] = useState("transport");
  const [wOpis, setWOpis] = useState("");
  const [wKwota, setWKwota] = useState("");
  const [wData, setWData] = useState(dzis());

  const [pKwota, setPKwota] = useState("");
  const [pData, setPData] = useState(dzis());
  const [pOpis, setPOpis] = useState("");

  async function pobierzWydatki() {
    const r = await supabase.from("wydatki").select("*").eq("zlecenie_id", id).order("data", { ascending: false });
    if (r.error) { setBrakMigracji(true); return; }
    setWydatki(r.data || []);
  }
  async function pobierzWplaty() {
    const r = await supabase.from("wplaty_klienta").select("*").eq("zlecenie_id", id).order("data", { ascending: false });
    if (r.error) { setBrakMigracji(true); return; }
    setWplaty(r.data || []);
  }

  async function pobierz() {
    const { data: z } = await supabase.from("zlecenia").select("id, nazwa, adres").eq("id", id).single();
    setZlecenie(z);

    const { data: w } = await supabase.from("wyceny").select("*").eq("zlecenie_id", id).order("wersja", { ascending: false });
    const lista = w || [];
    setWyceny(lista);
    setWycenaId(wybierzWycene(lista)?.id || "");

    const { data: zam } = await supabase.from("zamowienia")
      .select("id, status, zamowienie_pozycje(nazwa, ilosc, jednostka, cena_jednostkowa)").eq("zlecenie_id", id);
    setZamowienia((zam || []).map(({ id: zid, status }) => ({ id: zid, status })));
    setPozycjeZam((zam || []).flatMap(o => (o.zamowienie_pozycje || []).map(p => ({ ...p, zamowienie_id: o.id }))));

    const { data: pp } = await supabase.from("zlecenie_podwykonawcy").select("stawka").eq("zlecenie_id", id);
    setPrzypisania(pp || []);

    await pobierzWydatki();
    await pobierzWplaty();
    setLadowanie(false);
  }
  useEffect(() => { if (id) pobierz(); }, [id]);

  useEffect(() => {
    if (!wycenaId) { setPozycjeW([]); return; }
    supabase.from("wycena_pozycje").select("*").eq("wycena_id", wycenaId).then(({ data }) => setPozycjeW(data || []));
  }, [wycenaId]);

  async function dodajWydatek(e) {
    e.preventDefault();
    const k = parseFloat(wKwota);
    if (!k) return;
    const { error } = await supabase.from("wydatki")
      .insert({ zlecenie_id: id, kategoria: wKategoria, opis: wOpis || null, kwota: k, data: wData || dzis() });
    if (error) { setBrakMigracji(true); return; }
    setWKwota(""); setWOpis(""); setWData(dzis());
    pobierzWydatki();
  }
  async function usunWydatek(wid) {
    await supabase.from("wydatki").delete().eq("id", wid);
    pobierzWydatki();
  }
  async function dodajWplate(e) {
    e.preventDefault();
    const k = parseFloat(pKwota);
    if (!k) return;
    const { error } = await supabase.from("wplaty_klienta")
      .insert({ zlecenie_id: id, kwota: k, data: pData || dzis(), opis: pOpis || null });
    if (error) { setBrakMigracji(true); return; }
    setPKwota(""); setPOpis(""); setPData(dzis());
    pobierzWplaty();
  }
  async function usunWplate(pid) {
    await supabase.from("wplaty_klienta").delete().eq("id", pid);
    pobierzWplaty();
  }

  if (ladowanie) return <div className="p-5 text-muted">Ładowanie…</div>;
  if (!zlecenie) return <div className="p-5 text-muted">Nie znaleziono zlecenia.</div>;

  const wycena = wyceny.find(w => w.id === wycenaId) || null;
  const f = liczFinanse({ wycena, pozycjeWyceny: pozycjeW, zamowienia, pozycjeZamowien: pozycjeZam, przypisania, wydatki, wplaty });
  const zuzycie = zuzycieMaterialow({ pozycjeWyceny: pozycjeW, pozycjeZamowien: pozycjeZam });
  const problemy = zuzycie.filter(r => r.status !== "ok").length;
  const przekroczono = f.wykorzystanie !== null && f.wykorzystanie > 100;

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <Link href={`/zlecenia/${id}`} className="text-xs text-muted">&larr; {zlecenie.nazwa}</Link>
        <h1 className="text-xl font-bold mt-1">Koszty i wynik</h1>
        <div className="text-xs text-muted">Wszystkie kwoty bez VAT</div>
      </div>

      <div className="p-4">
        {brakMigracji && (
          <div className="text-xs rounded-lg p-3 mb-3 bg-status-redBg text-status-redFg">
            Brakuje aktualizacji bazy (wydatki i wpłaty klienta). Uruchom w Supabase plik <b>migracja-finanse.sql</b>.
          </div>
        )}

        {wyceny.length > 1 && (
          <>
            <label className="block text-xs text-muted mb-1">Plan liczony z wyceny</label>
            <select value={wycenaId} onChange={e => setWycenaId(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mb-4 text-sm bg-white">
              {wyceny.map(w => <option key={w.id} value={w.id}>Wycena v{w.wersja} ({w.status})</option>)}
            </select>
          </>
        )}
        {!f.maWycene && (
          <div className="text-xs rounded-lg p-3 mb-4 bg-accentsoft">
            Brak wyceny dla tego zlecenia — plan i cena dla klienta są zerowe. Dodaj wycenę (albo użyj kalkulatora), a plan policzy się sam.
          </div>
        )}

        {/* PODSUMOWANIE */}
        <div className="bg-white rounded-xl2 p-4 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <div className="text-muted">Cena dla klienta</div><div className="font-semibold">{zl(f.cena)}</div>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <div className="text-muted">Koszt planowany</div><div>{zl(f.planKoszt)}</div>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <div className="text-muted">Koszty dotychczas</div><div>{zl(f.kosztRazem)}</div>
          </div>
          {f.wykorzystanie !== null && (
            <>
              <div className="h-2 rounded-full bg-line overflow-hidden mb-1">
                <div className={`h-full ${przekroczono ? "bg-status-redFg" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, f.wykorzystanie)}%` }} />
              </div>
              <div className={`text-xs mb-3 ${przekroczono ? "text-status-redFg font-semibold" : "text-muted"}`}>
                Wykorzystano {proc(f.wykorzystanie)} planowanego kosztu{przekroczono ? " — budżet przekroczony" : ""}
              </div>
            </>
          )}
          <div className={`flex justify-between text-base font-bold pt-3 border-t border-line ${f.zysk < 0 ? "text-status-redFg" : "text-status-greenFg"}`}>
            <div>Zysk (cena − dotychczasowe koszty)</div><div>{zl(f.zysk)}</div>
          </div>
          <p className="text-xs text-muted mt-2">
            Przy zleceniu w toku zysk rośnie wraz z brakiem kolejnych kosztów — traktuj go jako ostateczny dopiero po poniesieniu wszystkich wydatków. Planowany zysk z wyceny: {zl(f.planZysk)}.
          </p>
        </div>

        {/* PLAN VS RZECZYWISTOŚĆ */}
        <div className="text-xs text-muted mb-1.5">PLAN A RZECZYWISTOŚĆ (zł)</div>
        <div className="bg-white rounded-xl2 p-4 mb-2">
          <div className="grid grid-cols-4 gap-1 text-[11px] text-muted pb-1 border-b border-line">
            <div></div><div className="text-right">Plan</div><div className="text-right">Rzeczywiste</div><div className="text-right">Różnica</div>
          </div>
          <Wiersz etykieta="Materiały" plan={f.planMaterial} rzecz={f.kosztMaterial} />
          <Wiersz etykieta="Robocizna" plan={f.planRobocizna} rzecz={f.kosztRobocizna} />
          <Wiersz etykieta="Pozostałe" plan={0} rzecz={f.kosztPozostale} />
          <div className="grid grid-cols-4 gap-1 text-xs pt-2 font-bold">
            <div>Razem</div>
            <div className="text-right">{kw(f.planKoszt)}</div>
            <div className="text-right">{kw(f.kosztRazem)}</div>
            <div className={`text-right ${f.kosztRazem > f.planKoszt ? "text-status-redFg" : "text-status-greenFg"}`}>
              {f.kosztRazem > f.planKoszt ? "+" : ""}{kw(f.kosztRazem - f.planKoszt)}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted mb-1">
          Materiały: zamówienia wysłane lub dostarczone (szkice się nie liczą) plus zakupy bezpośrednie. Robocizna: umowy z podwykonawcami ({zl(f.umowy)}) plus robocizna własna.
        </p>
        {f.bezCeny > 0 && (
          <p className="text-xs text-status-redFg mb-4">
            {f.bezCeny} {f.bezCeny === 1 ? "pozycja zamówień nie ma" : "pozycji zamówień nie ma"} ceny — koszt materiałów jest przez to zaniżony. Uzupełnij ceny w zamówieniach.
          </p>
        )}

        {/* ZUŻYCIE MATERIAŁÓW */}
        <div className="text-xs text-muted mt-4 mb-1.5">
          MATERIAŁY: WYCENA A ZAMÓWIENIA{problemy > 0 ? ` · do sprawdzenia: ${problemy}` : ""}
        </div>
        {zuzycie.length === 0 && <div className="text-sm text-muted mb-4">Brak pozycji materiałowych w wycenie i zamówieniach.</div>}
        {zuzycie.map(r => (
          <div key={r.klucz} className="bg-white rounded-xl2 p-3 mb-2 flex justify-between items-center gap-2">
            <div>
              <div className="font-semibold text-sm">{r.nazwa}</div>
              <div className="text-xs text-muted">
                wycena {+r.plan.toFixed(2)} · w zamówieniach {+r.zamowiono.toFixed(2)} {r.jednostka}
              </div>
            </div>
            <div className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${zuzycieStyl[r.status]}`}>
              {STATUS_ZUZYCIA[r.status]}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted mb-5">
          Porównanie obejmuje też zamówienia w szkicu, żebyś mógł wyłapać pomyłki przed wysłaniem do dostawcy. Pozycje łączę po nazwie i jednostce.
        </p>

        {/* WPŁATY KLIENTA */}
        <div className="text-xs text-muted mb-1.5">ROZLICZENIE Z KLIENTEM</div>
        <div className="bg-white rounded-xl2 p-4 mb-3">
          <div className="flex justify-between text-sm mb-1"><div className="text-muted">Cena dla klienta</div><div>{zl(f.cena)}</div></div>
          <div className="flex justify-between text-sm mb-1"><div className="text-muted">Wpłacono przez klienta</div><div>{zl(f.wplacono)}</div></div>
          <div className={`flex justify-between text-base font-bold mt-2 ${f.naleznosc < 0 ? "text-status-redFg" : ""}`}>
            <div>{f.naleznosc < 0 ? "Nadpłata" : "Do zapłaty przez klienta"}</div><div>{zl(Math.abs(f.naleznosc))}</div>
          </div>
        </div>
        {wplaty.map(p => (
          <div key={p.id} className="bg-white rounded-xl2 p-3 mb-2 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{zl(p.kwota)}</div>
              <div className="text-xs text-muted">{p.data}{p.opis ? ` · ${p.opis}` : ""}</div>
            </div>
            <button onClick={() => usunWplate(p.id)} className="text-status-redFg text-xs">Usuń</button>
          </div>
        ))}
        <form onSubmit={dodajWplate} className="bg-white rounded-xl2 p-4 border border-line mt-3 mb-6">
          <div className="text-xs text-muted mb-2">Zapisz wpłatę od klienta</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={pKwota} onChange={e => setPKwota(e.target.value)} type="number" step="0.01" placeholder="Kwota (zł)" required
              className="border border-line rounded-lg px-2 py-2 text-sm" />
            <input value={pData} onChange={e => setPData(e.target.value)} type="date"
              className="border border-line rounded-lg px-2 py-2 text-sm" />
          </div>
          <input value={pOpis} onChange={e => setPOpis(e.target.value)} placeholder="Opis (np. zaliczka, faktura 12/2026)"
            className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm" />
          <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold">Dodaj wpłatę</button>
        </form>

        {/* WYDATKI */}
        <div className="text-xs text-muted mb-1.5">WYDATKI NA ZLECENIU</div>
        <p className="text-xs text-muted mb-2">
          Tu wpisujesz koszty spoza zamówień i umów z podwykonawcami. Zamówienia i podwykonawców dodajesz w ich zakładkach — nie wpisuj ich drugi raz.
        </p>
        {wydatki.length === 0 && <div className="text-sm text-muted mb-2">Brak wydatków.</div>}
        {wydatki.map(w => (
          <div key={w.id} className="bg-white rounded-xl2 p-3 mb-2 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{zl(w.kwota)} · {nazwaKategorii(w.kategoria)}</div>
              <div className="text-xs text-muted">{w.data}{w.opis ? ` · ${w.opis}` : ""}</div>
            </div>
            <button onClick={() => usunWydatek(w.id)} className="text-status-redFg text-xs">Usuń</button>
          </div>
        ))}
        <form onSubmit={dodajWydatek} className="bg-white rounded-xl2 p-4 border border-line mt-3 mb-4">
          <div className="text-xs text-muted mb-2">Dodaj wydatek</div>
          <select value={wKategoria} onChange={e => setWKategoria(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 mb-2 text-sm bg-white">
            {KATEGORIE_WYDATKOW.map(k => <option key={k.id} value={k.id}>{k.nazwa}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={wKwota} onChange={e => setWKwota(e.target.value)} type="number" step="0.01" placeholder="Kwota (zł)" required
              className="border border-line rounded-lg px-2 py-2 text-sm" />
            <input value={wData} onChange={e => setWData(e.target.value)} type="date"
              className="border border-line rounded-lg px-2 py-2 text-sm" />
          </div>
          <input value={wOpis} onChange={e => setWOpis(e.target.value)} placeholder="Opis (np. paliwo, wynajem rusztowania)"
            className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm" />
          <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold">Dodaj wydatek</button>
        </form>
      </div>
    </div>
  );
}
