import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * A sitemap is how a crawler discovers URLs it was never linked to, and the
 * `Sitemap:` line in robots.txt is how it discovers the sitemap. Both halves are
 * scored because a sitemap nobody can find does little good.
 */
const checkSitemap: CheckFn = (ctx) => {
  const findings: string[] = [];
  const declared = ctx.parsedRobots?.sitemaps ?? [];

  const reachable = ctx.sitemap?.ok === true;
  const body = ctx.sitemap?.body ?? "";
  const isIndex = /<sitemapindex[\s>]/i.test(body);
  const urlCount = (body.match(/<loc>/gi) ?? []).length;
  const hasLastmod = /<lastmod>/i.test(body);

  let score = 0;
  if (reachable) {
    score += 55;
    findings.push(
      isIndex
        ? `Sitemap index found at ${ctx.sitemap?.url} listing ${urlCount} child sitemap${urlCount === 1 ? "" : "s"}.`
        : `Sitemap found at ${ctx.sitemap?.url} with ${urlCount} URL${urlCount === 1 ? "" : "s"}.`,
    );

    if (urlCount > 0) score += 15;
    else findings.push("The sitemap contains no <loc> entries.");

    if (hasLastmod) {
      score += 10;
      findings.push("Entries include <lastmod>, which helps engines re-crawl changed pages.");
    } else {
      findings.push("No <lastmod> dates — engines cannot tell which pages changed.");
    }

    if (!/xml/i.test(ctx.sitemap?.contentType ?? "")) {
      findings.push(
        `Served as "${ctx.sitemap?.contentType || "unknown"}" rather than application/xml.`,
      );
      score -= 5;
    }
  } else {
    findings.push(
      ctx.sitemap
        ? `No sitemap at ${ctx.sitemap.url} (HTTP ${ctx.sitemap.status || "unreachable"}).`
        : "No sitemap was fetched.",
    );
  }

  if (declared.length > 0) {
    score += 20;
    findings.push(`robots.txt declares ${declared.length} sitemap URL: ${declared.join(", ")}.`);
  } else {
    findings.push("robots.txt has no `Sitemap:` line.");
  }

  return result({
    id: "sitemap",
    label: "XML sitemap",
    category: "crawlability",
    score,
    weight: 5,
    findings,
    fix: !reachable
      ? "Publish /sitemap.xml listing every indexable URL with <lastmod>, and add a `Sitemap: https://…/sitemap.xml` line to robots.txt."
      : declared.length === 0
        ? "Add a `Sitemap: https://…/sitemap.xml` line to robots.txt so crawlers find it without guessing."
        : "Keep <lastmod> accurate — engines use it to decide when to re-read the page.",
  });
};

export default checkSitemap;
