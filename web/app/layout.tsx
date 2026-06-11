import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Argus — Autonomous SOC Investigation Agent",
  description:
    "An AI agent that autonomously investigates security alerts end-to-end on Splunk — planning its own SPL, pivoting across real data, reaching a grounded verdict, and executing real containment. Every conclusion links to the exact query and events behind it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-ink font-geist text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
