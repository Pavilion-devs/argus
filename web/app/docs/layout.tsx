import type { Metadata } from "next";
import DocsTopbar from "@/components/docs/DocsTopbar";
import DocsSidebar from "@/components/docs/DocsSidebar";
import Toc from "@/components/docs/Toc";
import PrevNext from "@/components/docs/PrevNext";

export const metadata: Metadata = {
  title: { default: "Argus Docs", template: "%s · Argus Docs" },
  description: "Documentation for Argus, the autonomous SOC analyst for Splunk.",
};

// No-flash theme: run before the docs subtree paints. Defaults to dark (brand).
const themeScript = `(function(){try{var t=localStorage.getItem('argus-docs-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0a0a0c] dark:text-zinc-100">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <DocsTopbar />
      <div className="mx-auto flex w-full max-w-[1600px]">
        <DocsSidebar />
        <main className="min-w-0 flex-1 px-6 py-10 lg:px-12">
          <article id="doc-article" className="mx-auto max-w-3xl">
            {children}
            <PrevNext />
          </article>
        </main>
        <Toc />
      </div>
    </div>
  );
}
