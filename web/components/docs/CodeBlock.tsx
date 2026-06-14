"use client";

import { useRef, useState, type ReactElement, type ReactNode } from "react";
import { Icon } from "@iconify/react";

/**
 * Wraps fenced code blocks (mapped from MDX `pre`) with a language label and a
 * copy button. Styled for both light and dark themes; no syntax tokenizing, so
 * it stays dependency-free and crisp.
 */
export default function CodeBlock({
  children,
  ...props
}: {
  children?: ReactNode;
} & React.HTMLAttributes<HTMLPreElement>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const childClass: string =
    (children && (children as ReactElement).props?.className) || "";
  const match = /language-([\w-]+)/.exec(childClass);
  const lang = match ? match[1] : "code";

  const copy = async () => {
    const text = ref.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group relative my-5 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#0f0f12]">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800/80">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {lang}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          aria-label="Copy code"
        >
          <Icon
            icon={copied ? "solar:check-read-linear" : "solar:copy-linear"}
            className="h-3.5 w-3.5"
          />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        ref={ref}
        {...props}
        className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200"
      >
        {children}
      </pre>
    </div>
  );
}
