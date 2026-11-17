"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { nazwaWyceny } from "../../../lib/wyceny";

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

const podwStatusNazwa = { ustalony: "Ustalony", w_trakcie: "W trakcie", odebrany: "Odebrany" };
const podwStatusStyl = {
  ustalony: "bg-status-grayBg text-status-grayFg",
  w_trakcie: "bg-status-blueBg text-status-blueFg",
  odebrany: "bg-status-greenBg text-status-greenFg",
};
const zl = (v) => (Number(v) || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";

export default function KartaZlecenia() {
  const { id } = useParams();
  const router = useRouter();
  const [zlecenie, setZlecenie] = useState(null);
  const [wyceny, setWyceny] = useState([]);
  const [ladowanie, setLadowanie] = useState(true);

  const [przypisania, setPrzypisania] = useState([]);
  const [kontaktyPodw, setKontaktyPodw] = useState([]);
  const [pokazDodaj, setPokazDodaj] = useState(false);
  const [wybranyPodw, setWybranyPodw] = useState("");
  const [robocizna, setRobocizna] = useState(0);
  const [wersjaRob, setWersjaRob] = useState(null);
  const [wyplacono, setWyplacono] = useState(0);
  const [blad, setBlad] = useState("");
  const [usuwanie, setUsuwanie] = useState(false);

  async function pobierz() {
    const { data: z } = await supabase.from("zlecenia").select("*").eq("id", id).single();
    setZlecenie(z);
    const { data: w } = await supabase.from("wyceny").select("*").eq("zlecenie_id", id).order("wersja", { ascending: false });
    setWyceny(w || []);

    // robocizna z najnowszej wyceny (to, co wyceniono klientowi)
    if (w && w.length > 0) {
      const { data: poz } = await supabase.from("wycena_pozycje").select("ilosc, cena_jednostkowa").eq("wycena_id", w[0].id).eq("typ", "robocizna");
      setRobocizna((poz || []).reduce((s, p) => s + p.ilosc * p.cena_jednostkowa, 0));
      setWersjaRob(w[0].wersja);
    }

    // podwykonawcy przypisani do zlecenia
    const { data: pp } = await supabase.from("zlecenie_podwykonawcy").select("*, kontakty(nazwa)").eq("zlecenie_id", id);
    setPrzypisania(pp || []);
    let suma = 0;
    if (pp && pp.length > 0) {
      const r = await supabase.from("platnosci_podwykonawcow").select("kwota").in("przypisanie_id", pp.map(x => x.id));
      if (!r.error) suma = (r.data || []).reduce((s, x) => s + Number(x.kwota), 0);
    }
    setWyplacono(suma);
    setLadowanie(false);
  }
  useEffect(() => {
    if (!id) return;
    pobierz();
    supabase.from("kontakty").select("id, nazwa").eq("typ", "podwykonawca").order("nazwa")
      .then(({ data }) => setKontaktyPodw(data || []));
  }, [id]);

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

  async function dodajPodwykonawce(e) {
    e.preventDefault();
    if (!wybranyPodw) return;
    const { data, error } = await supabase.from("zlecenie_podwykonawcy")
      .insert({ zlecenie_id: id, podwykonawca_id: wybranyPodw })
      .select().single();
    if (!error) router.push(`/podwykonawcy/${data.id}`);
  }

  async function usunZlecenie() {
    const tekst = `Usunąć zlecenie „${zlecenie.nazwa}” razem z wycenami, zamówieniami, podwykonawcami, wydatkami i wpłatami klienta?\n\nTego nie można cofnąć. Jeśli zlecenie ma tylko zniknąć z listy aktywnych, ustaw status „zakończone” zamiast je usuwać.`;
    if (!window.confirm(tekst)) return;
    setUsuwanie(true);
    setBlad("");
    // Usuwamy od najgłębszych danych do samego zlecenia. Kroki opcjonalne dotyczą tabel,
    // które mogą nie istnieć, jeśli nie uruchomiono jeszcze odpowiedniej aktualizacji bazy.
    const krok = async (opis, zapytanie, opcjonalny = false) => {
      const { error } = await zapytanie;
      if (error && !opcjonalny) throw new Error(`${opis}: ${error.message}`);
    };
    try {
      const wy = (await supabase.from("wyceny").select("id").eq("zlecenie_id", id)).data || [];
      if (wy.length) await krok("pozycje wycen", supabase.from("wycena_pozycje").delete().in("wycena_id", wy.map(x => x.id)));
      await krok("wyceny", supabase.from("wyceny").delete().eq("zlecenie_id", id));

      const zm = (await supabase.from("zamowienia").select("id").eq("zlecenie_id", id)).data || [];
      if (zm.length) await krok("pozycje zamówień", supabase.from("zamowienie_pozycje").delete().in("zamowienie_id", zm.map(x => x.id)));
      await krok("zamówienia", supabase.from("zamowienia").delete().eq("zlecenie_id", id));

      const pw = (await supabase.from("zlecenie_podwykonawcy").select("id").eq("zlecenie_id", id)).data || [];
      if (pw.length) await krok("wypłaty podwykonawców", supabase.from("platnosci_podwykonawcow").delete().in("przypisanie_id", pw.map(x => x.id)), true);
      await krok("podwykonawcy", supabase.from("zlecenie_podwykonawcy").delete().eq("zlecenie_id", id));

      await krok("wydatki", supabase.from("wydatki").delete().eq("zlecenie_id", id), true);
      await krok("wpłaty klienta", supabase.from("wplaty_klienta").delete().eq("zlecenie_id", id), true);
      await krok("zlecenie", supabase.from("zlecenia").delete().eq("id", id));
      router.push("/zlecenia");
    } catch (e) {
      setBlad(`Nie udało się usunąć zlecenia (${e.message}). Część danych mogła już zostać usunięta — spróbuj ponownie.`);
      setUsuwanie(false);
    }
  }

  if (ladowanie) return <div className="p-5 text-muted">Ładowanie…</div>;
  if (!zlecenie) return <div className="p-5 text-muted">Nie znaleziono zlecenia.</div>;

  const umowy = przypisania.reduce((s, p) => s + Number(p.stawka || 0), 0);
  const roznica = robocizna - umowy;
  const pokazPodsumowanie = przypisania.length > 0 || robocizna > 0;

  return (
    <div>
      <div className="px-5 pt-5 pb-3 bg-white border-b border-line">
        <Link href="/zlecenia" className="text-xs text-muted">&larr; Zlecenia</Link>
        <h1 className="text-xl font-bold mt-1">{zlecenie.nazwa}</h1>
        <div className="text-sm text-muted">{zlecenie.adres || "Brak adresu"}</div>
      </div>

      <div className="p-4">
        {blad && <div className="text-xs rounded-lg p-3 mb-3 bg-status-redBg text-status-redFg">{blad}</div>}
        <div className="text-xs text-muted mb-2">STATUS</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {statusyLista.map(s => (
            <button key={s} onClick={() => zmienStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${s === zlecenie.status ? (statusStyl[s] + " ring-2 ring-accent") : "bg-white text-muted"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        <Link href={`/zlecenia/${id}/finanse`}
          className="flex bg-white rounded-xl2 p-3.5 mb-5 justify-between items-center">
          <div>
            <div className="font-semibold text-sm">Koszty i wynik</div>
            <div className="text-xs text-muted">Plan a rzeczywistość, wpłaty klienta</div>
          </div>
          <span className="text-accent text-lg">&rarr;</span>
        </Link>

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
              <div className="font-semibold text-sm">{nazwaWyceny(w)}</div>
              <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${wycenaStatusStyl[w.status] || wycenaStatusStyl.szkic}`}>
                {w.status}
              </div>
            </div>
          </Link>
        ))}

        <div className="flex justify-between items-center mt-5 mb-2">
          <div className="text-sm font-semibold">Podwykonawcy</div>
          <button onClick={() => setPokazDodaj(v => !v)} className="text-xs bg-accent text-white rounded-lg px-3 py-1.5 font-semibold">
            + Dodaj podwykonawcę
          </button>
        </div>

        {pokazDodaj && (
          <form onSubmit={dodajPodwykonawce} className="bg-white rounded-xl2 p-4 border border-line mb-3">
            {kontaktyPodw.length === 0 ? (
              <p className="text-xs text-status-redFg">
                Brak podwykonawców w bazie. Dodaj kontakt typu „podwykonawca” w zakładce Kontakty.
              </p>
            ) : (
              <>
                <select value={wybranyPodw} onChange={e => setWybranyPodw(e.target.value)} required
                  className="w-full border border-line rounded-lg px-3 py-2 mb-3 text-sm bg-white">
                  <option value="">— wybierz podwykonawcę —</option>
                  {kontaktyPodw.map(k => <option key={k.id} value={k.id}>{k.nazwa}</option>)}
                </select>
                <button type="submit" className="w-full bg-accent text-white rounded-lg py-2.5 text-sm font-semibold">Przypisz do zlecenia</button>
              </>
            )}
          </form>
        )}

        {przypisania.length === 0 && !pokazDodaj && <div className="text-sm text-muted mb-3">Brak przypisanych podwykonawców.</div>}
        {przypisania.map(p => (
          <Link key={p.id} href={`/podwykonawcy/${p.id}`} className="block">
            <div className="bg-white rounded-xl2 p-3.5 mb-2.5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm">{p.kontakty?.nazwa || "Kontakt usunięty"}</div>
                <div className="text-xs text-muted">{p.stawka ? zl(p.stawka) : "kwota nieustalona"}</div>
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full font-semibold ${podwStatusStyl[p.status] || podwStatusStyl.ustalony}`}>
                {podwStatusNazwa[p.status] || p.status}
              </div>
            </div>
          </Link>
        ))}

        {pokazPodsumowanie && (
          <div className="bg-white rounded-xl2 p-4 mt-4">
            <div className="text-xs text-muted mb-2">ROBOCIZNA: WYCENA A PODWYKONAWCY</div>
            <div className="flex justify-between text-sm mb-1">
              <div className="text-muted">Robocizna w wycenie{wersjaRob ? ` (v${wersjaRob})` : ""}</div><div>{zl(robocizna)}</div>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <div className="text-muted">Umowy z podwykonawcami</div><div>{zl(umowy)}</div>
            </div>
            <div className={`flex justify-between text-sm font-bold mt-2 ${roznica < 0 ? "text-status-redFg" : "text-status-greenFg"}`}>
              <div>Różnica</div><div>{zl(roznica)}</div>
            </div>
            <div className="flex justify-between text-sm mt-3 pt-3 border-t border-line">
              <div className="text-muted">Wypłacono podwykonawcom</div><div>{zl(wyplacono)}</div>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <div className="text-muted">Jeszcze do zapłaty</div><div>{zl(umowy - wyplacono)}</div>
            </div>
            <p className="text-xs text-muted mt-3">
              Różnica to robocizna wyceniona klientowi minus umowy z podwykonawcami — zakładamy, że całą robociznę z wyceny wykonują podwykonawcy.
            </p>
          </div>
        )}

        <button onClick={usunZlecenie} disabled={usuwanie}
          className="w-full text-status-redFg text-xs py-2 mt-6 disabled:opacity-50">
          {usuwanie ? "Usuwanie…" : "Usuń zlecenie"}
        </button>
      </div>
    </div>
  );
}
