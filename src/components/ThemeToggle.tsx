"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "geo-lens-theme";
/** Dispatched on toggle so every mounted toggle re-reads the DOM together. */
const CHANGE_EVENT = "geo-lens-theme-change";

/**
 * The theme lives on <html> (stamped before paint by ThemeScript), not in React
 * state, so it is read with useSyncExternalStore rather than mirrored into state
 * from an effect. The server snapshot is null, which renders a blank glyph and
 * lets the real icon appear on hydration without a mismatch.
 */
function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function getSnapshot(): Theme {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getSnapshot, () => null);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage — the toggle still works for this page.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-9 items-center justify-center rounded-md border border-border-subtle bg-surface text-muted transition-colors hover:text-foreground"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {theme === null ? "" : theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
