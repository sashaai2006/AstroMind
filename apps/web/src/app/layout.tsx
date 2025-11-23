import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstraMind | AI Agent Orchestrator",
  description: "Autonomous AI Swarm for Software Development",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-cosmic text-slate-100 antialiased min-h-screen flex flex-col overflow-hidden">
        {/* Toast Notifications */}
        <Toaster position="top-right" theme="dark" richColors />
        
        <main className="flex-1 flex flex-col h-full">
            {children}
        </main>
      </body>
    </html>
  );
}
