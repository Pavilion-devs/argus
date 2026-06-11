import Link from "next/link";
import { Icon } from "@iconify/react";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-blue-orb shadow-glow-sm">
        <Icon icon="solar:eye-scan-linear" className="h-5 w-5 text-white" />
      </span>
      <span className="text-[15px] font-medium tracking-tight text-white">Argus</span>
    </Link>
  );
}

export default function Nav({ variant = "landing" }: { variant?: "landing" | "app" }) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex w-full justify-center px-4 pt-4 md:pt-6">
      <nav className="flex w-full max-w-4xl items-center justify-between rounded-full border border-white/10 bg-zinc-900/70 px-3 py-2 backdrop-blur-md transition-all hover:border-white/20">
        <Logo />
        {variant === "landing" ? (
          <>
            <div className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
              <a href="#how" className="transition-colors hover:text-white">How it works</a>
              <a href="#capabilities" className="transition-colors hover:text-white">Capabilities</a>
              <a href="#evidence" className="transition-colors hover:text-white">Grounding</a>
              <a href="#benchmark" className="transition-colors hover:text-white">Benchmark</a>
            </div>
            <Link href="/dashboard" className="btn-primary !px-4 !py-2 text-[13px]">
              Launch Console
              <Icon icon="solar:arrow-right-up-linear" className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-zinc-400 transition-colors hover:text-white">
              Overview
            </Link>
            <a
              href="https://github.com"
              className="hidden items-center gap-1.5 text-zinc-400 transition-colors hover:text-white sm:flex"
            >
              <Icon icon="solar:book-2-linear" className="h-4 w-4" /> Docs
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
