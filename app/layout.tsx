import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Zion Ohana — Rede de Igrejas",
  description: "Controle financeiro DPS & OF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 ml-64">
          {children}
        </main>
      </body>
    </html>
  );
}
