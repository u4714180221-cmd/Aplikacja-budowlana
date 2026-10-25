"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [blad, setBlad] = useState("");
  const router = useRouter();

  async function zaloguj(e) {
    e.preventDefault();
    setBlad("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: haslo });
    if (error) { setBlad("Nieprawidłowy e-mail lub hasło."); return; }
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={zaloguj} className="w-full max-w-sm bg-white rounded-xl2 p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Logowanie</h1>
        <p className="text-muted text-sm mb-5">Aplikacja budowlana</p>
        <label className="block text-xs text-muted mb-1">E-mail</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
          className="w-full border border-line rounded-lg px-3 py-2 mb-4" />
        <label className="block text-xs text-muted mb-1">Hasło</label>
        <input value={haslo} onChange={e => setHaslo(e.target.value)} type="password" required
          className="w-full border border-line rounded-lg px-3 py-2 mb-4" />
        {blad && <p className="text-status-redFg text-sm mb-3">{blad}</p>}
        <button type="submit" className="w-full bg-accent text-white rounded-lg py-3 font-semibold">
          Zaloguj
        </button>
      </form>
    </div>
  );
}
