"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import BottomNav from "./BottomNav";

export default function AuthGate({ children }) {
  const [sesja, setSesja] = useState(undefined); // undefined = ładowanie
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesja(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSesja(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sesja === undefined) return;
    if (!sesja && pathname !== "/login") router.push("/login");
  }, [sesja, pathname, router]);

  if (pathname === "/login") return children;
  if (sesja === undefined) return <div className="p-6 text-muted">Ładowanie…</div>;
  if (!sesja) return null;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-bg">
      <div className="flex-1 overflow-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
