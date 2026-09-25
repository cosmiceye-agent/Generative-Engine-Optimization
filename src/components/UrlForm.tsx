"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * URL entry form. Navigates to /analyze?url=… rather than fetching in place, so
 * every result has a shareable address and the back button behaves.
 */
export function UrlForm({
  initialUrl = "",
  autoFocus = false,
  size = "large",
}: {
  initialUrl?: string;
  autoFocus?: boolean;
  size?: "large" | "compact";
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialUrl);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === "") return;
    router.push(`/analyze?url=${encodeURIComponent(trimmed)}`);
  }

  const large = size === "large";

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
      <label htmlFor="url-input" className="sr-only">
        URL to analyse
      </label>
      <input
        id="url-input"
        name="url"
        type="text"
        inputMode="url"
        autoComplete="url"
        autoFocus={autoFocus}
        spellCheck={false}
        placeholder="https://example.com/your-page"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={`min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface-raised px-4 text-foreground placeholder:text-muted ${
          large ? "h-13 py-3.5 text-base" : "h-11 text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-lg bg-accent px-6 font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50 ${
          large ? "h-13 text-base" : "h-11 text-sm"
        }`}
        disabled={value.trim() === ""}
      >
        Analyze
      </button>
    </form>
  );
}
