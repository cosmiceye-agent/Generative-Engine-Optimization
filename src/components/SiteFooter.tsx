import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border-subtle bg-surface">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold">{site.name}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{site.tagline}.</p>
        </div>

        <nav aria-label="Guides">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Learn</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/learn/what-is-geo">What is GEO?</Link></li>
            <li><Link className="hover:text-accent" href="/learn/geo-vs-seo">GEO vs SEO</Link></li>
            <li><Link className="hover:text-accent" href="/learn/structure-content-for-ai-citations">Structuring for citations</Link></li>
          </ul>
        </nav>

        <nav aria-label="Site">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Site</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/analyze">Run an audit</Link></li>
            <li><Link className="hover:text-accent" href="/faq">FAQ</Link></li>
            <li><Link className="hover:text-accent" href="/about">About</Link></li>
            <li><a className="hover:text-accent" href="/llms.txt">llms.txt</a></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border-subtle">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted">
          © {new Date().getFullYear()} {site.name}. Analyses reflect the page as fetched at that moment.
        </p>
      </div>
    </footer>
  );
}
