import { supabase } from "./supabaseClient";

// Supabase zwraca domyślnie max 1000 wierszy na zapytanie — pobieramy kolejne porcje,
// żeby raporty nie gubiły danych, gdy firma ma ich więcej.
export async function pobierzWszystko(tabela, kolumny) {
  const rozmiar = 1000;
  let od = 0;
  let wszystko = [];
  while (true) {
    const { data, error } = await supabase.from(tabela).select(kolumny).order("id").range(od, od + rozmiar - 1);
    if (error) return { data: null, error };
    wszystko = wszystko.concat(data || []);
    if (!data || data.length < rozmiar) break;
    od += rozmiar;
  }
  return { data: wszystko, error: null };
}
