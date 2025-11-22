import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gangai | AI Agent Orchestrator",
  description: "Build your AI team in seconds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col">
        <header className="border-b border-slate-800 p-4 flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">Gangai</h1>
            <div className="text-sm text-slate-400">v0.1.0</div>
        </header>
        <main className="flex-1 flex flex-col">
            {children}
        </main>
      </body>
    </html>
  );
}

