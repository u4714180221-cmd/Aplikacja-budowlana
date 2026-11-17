// Wspólne wzory dla wycen: nazwa i VAT.
// Koszty i marża są liczone netto. Cena dla klienta = koszt + marża (netto), a VAT dolicza się na końcu.

export const STAWKI_VAT = [8, 23];
export const DOMYSLNY_VAT = 23;

export const nazwaWyceny = (w) => (w?.nazwa || "").trim() || `Wycena v${w?.wersja}`;

export const stawkaVat = (w) => (w && w.stawka_vat != null ? Number(w.stawka_vat) : DOMYSLNY_VAT);

export function sumyWyceny({ koszt, marzaProc, vatProc }) {
  const marza = koszt * (Number(marzaProc) || 0) / 100;
  const netto = koszt + marza;
  const vat = netto * (Number(vatProc) || 0) / 100;
  return { koszt, marza, netto, vat, brutto: netto + vat };
}
