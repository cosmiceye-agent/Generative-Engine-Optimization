"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "error";

const LABEL: Record<State, string> = {
  idle: "Copy report as Markdown",
  copied: "Copied to clipboard",
  error: "Copy failed — select and copy manually",
};

/**
 * Copies the pre-rendered Markdown report. The Markdown is generated on the
 * server and passed in as a string, so this component stays a thin clipboard
 * wrapper rather than shipping the report generator to the browser.
 */
export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear the pending reset on unmount, so navigating away mid-timeout cannot
  // call setState on an unmounted component.
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setState("copied");
    } catch {
      setState("error");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2400);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised px-3.5 text-sm font-medium transition-colors hover:border-border-strong"
      >
        {state === "copied" ? (
          <svg
            viewBox="0 0 16 16"
            className="size-3.5 text-pass"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8.5l3.5 3.5L13 4.5" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 16 16"
            className="size-3.5 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
            <path d="M10.5 3.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3.5V9a1.5 1.5 0 0 0 1.5 1.5" />
          </svg>
        )}
        {LABEL[state]}
      </button>

      <p className="text-xs text-muted">Paste it into an issue, a PR, or back into an assistant.</p>

      {/* The live region is separate from the button label so the announcement
          fires on the state change rather than on focus. */}
      <span aria-live="polite" className="sr-only">
        {state === "idle" ? "" : LABEL[state]}
      </span>
    </div>
  );
}
