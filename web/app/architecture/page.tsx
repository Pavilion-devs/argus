import Link from "next/link";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";

export const metadata = {
  title: "Argus — Architecture",
  description:
    "How Argus autonomously investigates Splunk alerts end-to-end — SPL via the MCP Server, grounded verdicts, gated containment, and detection-as-code.",
};

export default function ArchitecturePage() {
  return (
    <main className="flex min-h-screen w-full flex-col bg-[#f6f8fc] text-slate-900">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          ← Back to home
        </Link>
        <span className="text-sm font-semibold tracking-tight text-slate-700">
          Argus architecture
        </span>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-12 md:px-10">
        <ArchitectureDiagram className="mx-auto max-w-[1644px]" />
      </div>
    </main>
  );
}
