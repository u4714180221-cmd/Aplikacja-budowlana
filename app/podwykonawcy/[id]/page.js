"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { nazwaWyceny } from "../../../lib/wyceny";

const STATUSY = [
  { id: "ustalony", nazwa: "Ustalony" },
  { id: "w_trakcie", nazwa: "W trakcie" },
  { id: "odebrany", nazwa: "Odebrany" },
];
const statusStyl = {
  ustalony: "bg-status-grayBg text-status-grayFg",
  w_trakcie: "bg-status-blueBg text-status-blueFg",
  odebrany: "bg-status-greenBg text-status-greenFg",
};
const zl = (v) => (Number(v) || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
const dzis = () => new Date().toISOString().slice(0, 10);

export default function KartaPodwykonawcy() {
  const { id } = useParams();
  const router = useRouter();

  const [przyp, setPrzyp] = useState(null);
  const [wykonawca, setWykonawca] = useState(null);
  const [zlecenie, setZlecenie] = useState(null);
  const [wyceny, setWyceny] = useState([]);
  const [platnosci, setPlatnosci] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [brakMigracji, setBrakMigracji] = useState(false);
  const [komunikat, setKomunikat] = useState("");

  // umowa
  const [kwota, setKwota] = useState("");
  const [start, setStart] = useState("");
  const [koniec, setKoniec] = useState("");
  const [zakres, setZakres] = useState("");
  const [material, setMaterial] = useState("");

  // generator zakresu z wyceny
  const [wycenaId, setWycenaId] = useState("");
  const [pozycje, setPozycje] = useState([]);
  const [zaznaczone, setZaznaczone] = useState({});
  const [pokazMaterialy, setPokazMaterialy] = useState(false);

  // nowa wypłata
  const [wKwota, setWKwota] = useState("");
  const [wData, setWData] = useState(dzis());
  const [wOpis, setWOpis] = useState("");

  async function pobierzPlatnosci() {
    const r = await supabase.from("platnosci_podwykonawcow").select("*").eq("przypisanie_id", id).order("data", { ascending: false });
    if (r.error) { setBrakMigracji(true); return; }
    setPlatnosci(r.data || []);
  }

  async function pobierz() {
    const { data: p } = await supabase.from("zlecenie_podwykonawcy").select("*").eq("id", id).single();
    setPrzyp(p);
    if (p) {
      setKwota(p.stawka ?? "");
      setStart(p.termin_start || "");
      setKoniec(p.termin_koniec || "");
      setZakres(p.zakres_prac || "");
      const { data: k } = await supabase.from("kontakty").select("nazwa, telefon").eq("id", p.podwykonawca_id).single();
      setWykonawca(k);
      const { data: z } = await supabase.from("zlecenia").select("id, nazwa, adres").eq("id", p.zlecenie_id).single();
      setZlecenie(z);
      const { data: w } = await supabase.from("wyceny").select("*").eq("zlecenie_id", p.zlecenie_id).order("wersja", { ascending: false });
      setWyceny(w || []);
      await pobierzPlatnosci();
    }
    setLadowanie(false);
  }
  useEffect(() => { if (id) pobierz(); }, [id]);

  function pokazKomunikat(t) {
    setKomunikat(t);
    setTimeout(() => setKomunikat(""), 3500);
  }

  async function zapisz() {
    const baza = { stawka: parseFloat(kwota) || null, zakres_prac: zakres };
    const { error } = await supabase.from("zlecenie_podwykonawcy")
      .update({ ...baza, termin_start: start || null, termin_koniec: koniec || null }).eq("id", id);
    if (!error) { pokazKomunikat("Zapisano ✓"); return; }
    // baza bez migracji nie ma kolumn z terminami — zapisz przynajmniej kwotę i zakres
    const r2 = await supabase.from("zlecenie_podwykonawcy").update(baza).eq("id", id);
    setBrakMigracji(true);
    pokazKomunikat(r2.error ? "Nie udało się zapisać." : "Zapisano kwotę i zakres. Terminów nie zapisano — uruchom migrację bazy.");
  }

  async function zmienStatus(s) {
    await supabase.from("zlecenie_podwykonawcy").update({ status: s }).eq("id", id);
    setPrzyp(p => ({ ...p, status: s }));
  }

  async function wczytajPozycje(wid) {
    setWycenaId(wid);
    setZaznaczone({});
    if (!wid) { setPozycje([]); return; }
    const { data } = await supabase.from("wycena_pozycje").select("*").eq("wycena_id", wid).order("kolejnosc");
    setPozycje(data || []);
  }

  function wstawDoZakresu() {
    const wybrane = pozycje.filter(p => zaznaczone[p.id]);
    if (wybrane.length === 0) return;
    const linie = wybrane.map(p => `• ${p.nazwa} — ${p.ilosc} ${p.jednostka}`).join("\n");
    setZakres(z => (z ? z.replace(/\s+$/, "") + "\n" : "") + linie);
    setZaznaczone({});
  }

  function ustawMaterial(v) {
    setMaterial(v);
    setZakres(z => {
      const bez = z.split("\n").filter(l => !l.startsWith("Materiał zapewnia:")).join("\n").replace(/\s+$/, "");
      return v ? (bez ? bez + "\n" : "") + `Materiał zapewnia: ${v}` : bez;
    });
  }

  async function kopiuj() {
    const tekst = [
      `ZAKRES PRAC — ${zlecenie?.nazwa || ""}`,
      zlecenie?.adres ? `Adres: ${zlecenie.adres}` : null,
      `Wykonawca: ${wykonawca?.nazwa || ""}`,
      start || koniec ? `Termin: ${start || "…"} – ${koniec || "…"}` : null,
      kwota ? `Kwota umowna: ${zl(kwota)}` : null,
      "",
      zakres,
    ].filter(x => x !== null).join("\n");
    try {
      await navigator.clipboard.writeText(tekst);
      pokazKomunikat("Skopiowano do schowka ✓");
    } catch {
      pokazKomunikat("Nie udało się skopiować — zaznacz tekst ręcznie.");
    }
  }

  async function dodajPlatnosc(e) {
    e.preventDefault();
    const k = parseFloat(wKwota);
    if (!k) return;
    const { error } = await supabase.from("platnosci_podwykonawcow")
      .insert({ przypisanie_id: id, kwota: k, data: wData || dzis(), opis: wOpis || null });
    if (error) { setBrakMigracji(true); return; }
    setWKwota(""); setWOpis(""); setWData(dzis());
    pobierzPlatnosci();
  }

  async function usunPlatnosc(pid) {
    await supabase.from("platnosci_podwykonawcow").delete().eq("id", pid);
    pobierzPlatnosci();
  }

  async function usunPrzypisanie() {
    if (!window.confirm("Usunąć tego podwykonawcę ze zlecenia razem z zapisanymi wypłatami?")) return;
    await supabase.from("zlecenie_podwykonawcy").delete().eq("id", id);
    router.push(`/zlecenia/${przyp.zlecenie_id}`);
  }

  if (ladowanie) return <div className="p-5 text-muted">Ładowanie…</div>;
  if (!przyp) return <div className="p-5 text-muted">Nie znaleziono przypisania.</div>;

  const wyplacono = platnosci.reduce((s, p) => s + Number(p.kwota), 0);
  const umowna = parseFloat(kwota) || 0;
  const pozostalo = umowna - wyplacono;
  const widocznePozycje = pozycje.filter(p => pokazMaterialy || p.typ === "robocizna");

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <Link href={`/zlecenia/${przyp.zlecenie_id}`} className="text-xs text-muted">&larr; {zlecenie?.nazwa}</Link>
        <h1 className="text-xl font-bold mt-1">{wykonawca?.nazwa || "Podwykonawca"}</h1>
        {wykonawca?.telefon && <div className="text-sm text-muted">{wykonawca.telefon}</div>}
      </div>

      <div className="p-4">
        {brakMigracji && (
          <div className="text-xs rounded-lg p-3 mb-3 bg-status-redBg text-status-redFg">
            Brakuje aktualizacji bazy (terminy i wypłaty). Uruchom w Supabase plik <b>migracja-podwykonawcy.sql</b>.
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {STATUSY.map(s => (
            <button key={s.id} onClick={() => zmienStatus(s.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${s.id === przyp.status ? (statusStyl[s.id] + " ring-2 ring-accent") : "bg-white text-muted"}`}>
              {s.nazwa}
            </button>
          ))}
        </div>

        {/* UMOWA */}
        <div className="text-xs text-muted mb-1.5">UMOWA</div>
        <div className="bg-white rounded-xl2 p-4 mb-5">
          <label className="block text-xs text-muted mb-1">Kwota umowna (zł)</label>
          <input value={kwota} onChange={e => setKwota(e.target.value)} type="number" step="0.01"
            className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted mb-1">Początek prac</label>
              <input value={start} onChange={e => setStart(e.target.value)} type="date"
                className="w-full border border-line rounded-lg px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Koniec prac</label>
              <input value={koniec} onChange={e => setKoniec(e.target.value)} type="date"
                className="w-full border border-line rounded-lg px-2 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* ZAKRES PRAC */}
        <div className="text-xs text-muted mb-1.5">ZAKRES PRAC</div>
        <div className="bg-white rounded-xl2 p-4 mb-5">
          <label className="block text-xs text-muted mb-1">Ułóż zakres z pozycji wyceny</label>
          <select value={wycenaId} onChange={e => wczytajPozycje(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 mb-2 text-sm bg-white">
            <option value="">— wybierz wycenę —</option>
            {wyceny.map(w => <option key={w.id} value={w.id}>{nazwaWyceny(w)}</option>)}
          </select>
          {wycenaId && (
            <>
              <label className="flex items-center gap-2 mb-2 text-xs text-muted">
                <input type="checkbox" checked={pokazMaterialy} onChange={e => setPokazMaterialy(e.target.checked)} />
                Pokaż też pozycje materiałowe
              </label>
              {widocznePozycje.length === 0 && (
                <p className="text-xs text-muted mb-2">Brak pozycji robocizny w tej wycenie. Dodaj je w edytorze wyceny (typ „Robocizna”).</p>
              )}
              {widocznePozycje.map(p => (
                <label key={p.id} className="flex items-center gap-2 mb-1.5 text-sm">
                  <input type="checkbox" checked={!!zaznaczone[p.id]}
                    onChange={e => setZaznaczone(z => ({ ...z, [p.id]: e.target.checked }))} />
                  {p.nazwa} — {p.ilosc} {p.jednostka}
                </label>
              ))}
              {widocznePozycje.length > 0 && (
                <button onClick={wstawDoZakresu} className="w-full border border-line rounded-lg py-2 text-sm font-semibold text-accent mt-1 mb-3">
                  Wstaw zaznaczone do zakresu
                </button>
              )}
            </>
          )}

          <label className="block text-xs text-muted mb-1 mt-2">Materiał zapewnia</label>
          <select value={material} onChange={e => ustawMaterial(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm bg-white">
            <option value="">— nie dopisuj —</option>
            <option value="zleceniodawca">zleceniodawca</option>
            <option value="wykonawca">wykonawca</option>
          </select>

          <label className="block text-xs text-muted mb-1">Treść zakresu (możesz dowolnie edytować)</label>
          <textarea value={zakres} onChange={e => setZakres(e.target.value)} rows={8}
            placeholder="Opisz zakres prac albo wstaw pozycje z wyceny powyżej."
            className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-2 mb-2">
          <button onClick={zapisz} className="flex-1 bg-accent text-white rounded-xl2 py-3 text-sm font-semibold">Zapisz</button>
          <button onClick={kopiuj} className="flex-1 bg-white border border-line rounded-xl2 py-3 text-sm font-semibold">Kopiuj zakres</button>
        </div>
        <div className="text-xs text-center h-4 mb-4 text-muted">{komunikat}</div>

        {/* ROZLICZENIE */}
        <div className="text-xs text-muted mb-1.5">ROZLICZENIE</div>
        <div className="bg-white rounded-xl2 p-4 mb-3">
          <div className="flex justify-between text-sm mb-1"><div className="text-muted">Kwota umowna</div><div>{zl(umowna)}</div></div>
          <div className="flex justify-between text-sm mb-1"><div className="text-muted">Wypłacono</div><div>{zl(wyplacono)}</div></div>
          <div className={`flex justify-between text-base font-bold mt-2 ${pozostalo < 0 ? "text-status-redFg" : ""}`}>
            <div>{pozostalo < 0 ? "Przekroczono o" : "Do zapłaty"}</div><div>{zl(Math.abs(pozostalo))}</div>
          </div>
        </div>

        {platnosci.map(p => (
          <div key={p.id} className="bg-white rounded-xl2 p-3 mb-2 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{zl(p.kwota)}</div>
              <div className="text-xs text-muted">{p.data}{p.opis ? ` · ${p.opis}` : ""}</div>
            </div>
            <button onClick={() => usunPlatnosc(p.id)} className="text-status-redFg text-xs">Usuń</button>
          </div>
        ))}

        <form onSubmit={dodajPlatnosc} className="bg-white rounded-xl2 p-4 border border-line mt-3 mb-6">
          <div className="text-xs text-muted mb-2">Zapisz wypłatę</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={wKwota} onChange={e => setWKwota(e.target.value)} type="number" step="0.01" placeholder="Kwota (zł)" required
              className="border border-line rounded-lg px-2 py-2 text-sm" />
            <input value={wData} onChange={e => setWData(e.target.value)} type="date"
              className="border border-line rounded-lg px-2 py-2 text-sm" />
          </div>
          <input value={wOpis} onChange={e => setWOpis(e.target.value)} placeholder="Opis (np. zaliczka, rozliczenie końcowe)"
            className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm" />
          <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold">Dodaj wypłatę</button>
        </form>

        <button onClick={usunPrzypisanie} className="w-full text-status-redFg text-xs py-2">
          Usuń podwykonawcę ze zlecenia
        </button>
      </div>
    </div>
  );
}
