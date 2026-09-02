import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cantina Digital — E.E. Antônio Caio",
  description: "Gerencie recargas e saldos da cantina dos alunos de forma rápida, segura e digital.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#DC2626",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${lexend.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-[--bg-base] text-[--text-primary] antialiased font-[family-name:var(--font-lexend)]">
        {children}
      </body>
    </html>
  );
}
