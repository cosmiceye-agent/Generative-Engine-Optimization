"use client";

import { useState } from "react";

/**
 * Copies the pre-rendered Markdown report. The Markdown is generated on the
 * server and passed in as a string, so this component stays a thin clipboard
 * wrapper rather than shipping the report generator to the browser.
 */
export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border-subtle bg-surface-raised px-3 text-sm font-medium transition-colors hover:bg-surface"
    >
      {state === "copied" ? "Copied" : state === "error" ? "Copy failed" : "Copy report as Markdown"}
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "Report copied to clipboard" : ""}
      </span>
    </button>
  );
}
