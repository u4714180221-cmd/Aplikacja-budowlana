import "./globals.css";
import AuthGate from "./AuthGate";

export const metadata = { title: "Aplikacja budowlana" };

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
