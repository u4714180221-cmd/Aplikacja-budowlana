"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pozycje = [
  { href: "/", label: "Pulpit", d: "M4 11 12 4l8 7M6 10v9h12v-9" },
  { href: "/zlecenia", label: "Zlecenia", d: "M5 6h14M5 12h14M5 18h9" },
  { href: "/wyceny", label: "Wyceny", d: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM8 8h8M8 13h8" },
  { href: "/kalkulator", label: "Kalkulator", d: "M5 3h14v18H5zM8 8h8M8 13h3M14 13h3M8 17h3M14 17h3", rect: true },
  { href: "/zamowienia", label: "Zamówienia", d: "M3 7h10v8H3zM13 10h4l4 3v2h-8z" },
  { href: "/kontakty", label: "Kontakty", d: "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6", circles: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <div className="flex justify-around py-2 px-1 bg-white border-t border-line">
      {pozycje.map((p) => {
        const aktywny = pathname === p.href;
        return (
          <Link key={p.href} href={p.href} className={aktywny ? "text-accent" : "text-muted"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              {p.circles && <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /></>}
              <path d={p.d} />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
