import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/analyze", label: "Analyze" },
  { href: "/learn", label: "Learn" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/85 backdrop-blur">
      {/* First tab stop on every page, per WCAG 2.4.1. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-accent-contrast"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden="true"
            className="grid size-6 place-items-center rounded-md bg-accent text-[11px] font-bold text-accent-contrast"
          >
            GL
          </span>
          GEO Lens
        </Link>

        <nav aria-label="Main" className="ml-auto">
          <ul className="flex items-center gap-1 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground sm:px-3"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
