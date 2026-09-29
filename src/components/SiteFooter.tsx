import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

const LEARN = [
  { href: "/learn/what-is-geo", label: "What is GEO?" },
  { href: "/learn/geo-vs-seo", label: "GEO vs SEO" },
  { href: "/learn/structure-content-for-ai-citations", label: "Structuring for citations" },
] as const;

const SITE_LINKS = [
  { href: "/analyze", label: "Run an audit" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-contrast">
              <Logo className="size-5" />
            </span>
            <span className="font-display text-[1.0625rem] font-semibold tracking-tight">
              {site.name}
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{site.tagline}.</p>
        </div>

        {/* Labelled by the nav's aria-label rather than a heading: these are
            two-word link-group labels, and as H2s they showed up in every
            heading-structure audit of the site as content-free subheadings. */}
        <nav aria-label="Guides">
          <p className="eyebrow">Learn</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {LEARN.map((item) => (
              <li key={item.href}>
                <Link className="text-muted transition-colors hover:text-accent" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Site">
          <p className="eyebrow">Site</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {SITE_LINKS.map((item) => (
              <li key={item.href}>
                <Link className="text-muted transition-colors hover:text-accent" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a className="text-muted transition-colors hover:text-accent" href="/llms.txt">
                llms.txt
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border-subtle">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {site.name}. Every audit reflects the page as fetched at that
          moment.
        </p>
      </div>
    </footer>
  );
}
