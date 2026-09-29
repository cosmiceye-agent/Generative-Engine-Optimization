"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * URL entry form. Navigates to /analyze?url=… rather than fetching in place, so
 * every result has a shareable address and the back button behaves.
 *
 * The push runs inside a transition purely so the button can show a pending
 * state: the audit is a live network fetch of someone else's site and can take
 * several seconds, and without feedback the first click feels ignored.
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
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === "") return;
    startTransition(() => {
      router.push(`/analyze?url=${encodeURIComponent(trimmed)}`);
    });
  }

  const large = size === "large";
  const height = large ? "h-13" : "h-11";

  return (
    <form
      onSubmit={onSubmit}
      className={`group flex w-full flex-col gap-2 rounded-xl sm:flex-row sm:gap-0 sm:rounded-2xl sm:border sm:border-border-subtle sm:bg-surface-raised sm:p-1.5 sm:shadow-sm sm:focus-within:border-accent`}
    >
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
        className={`min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface-raised px-4 font-mono text-foreground placeholder:font-sans placeholder:text-muted sm:rounded-none sm:border-0 sm:bg-transparent sm:focus-visible:outline-none ${height} ${
          large ? "text-base" : "text-sm"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-xl bg-accent px-6 font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45 ${height} ${
          large ? "text-base" : "text-sm"
        }`}
        disabled={value.trim() === "" || isPending}
      >
        {isPending ? "Auditing…" : "Audit"}
      </button>
    </form>
  );
}
