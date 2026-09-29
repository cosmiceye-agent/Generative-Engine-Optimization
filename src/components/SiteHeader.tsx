import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

const NAV = [
  { href: "/analyze", label: "Analyze" },
  { href: "/learn", label: "Learn" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-md">
      {/* First tab stop on every page, per WCAG 2.4.1. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-accent-contrast"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-contrast">
            <Logo className="size-5" />
          </span>
          <span className="font-display text-[1.0625rem] font-semibold tracking-tight">
            Envoyix
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto">
          <ul className="flex items-center gap-0.5 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-2.5 py-1.5 font-medium text-muted transition-colors hover:bg-surface hover:text-foreground sm:px-3"
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
