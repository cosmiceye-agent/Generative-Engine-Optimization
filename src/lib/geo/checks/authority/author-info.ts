import type { CheckFn } from "../../types";
import { extractJsonLd, indexById, readName, typesOf } from "../../schema";
import { result } from "../helpers";

/**
 * Attribution signals. An engine deciding whether to cite a page weighs whether a
 * named, identifiable person or organisation stands behind it. Schema-level
 * authorship is worth more than a byline in prose because it is unambiguous.
 */
const BYLINE_SELECTOR = '[rel="author"], .author, .byline, [itemprop="author"], [class*="author" i]';

const checkAuthorInfo: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];
  let score = 0;

  const { nodes } = extractJsonLd($);
  // Authors and publishers are routinely given as `@id` references to a node
  // defined elsewhere in the graph, so resolve against the whole document.
  const byId = indexById(nodes);

  const schemaAuthors = nodes
    .filter((node) => "author" in node)
    .map((node) => readName(node["author"], byId))
    .filter((name): name is string => name !== null);

  const publishers = nodes
    .filter((node) => "publisher" in node)
    .map((node) => readName(node["publisher"], byId))
    .filter((name): name is string => name !== null);

  const personNodes = nodes.filter((node) => typesOf(node).includes("Person"));

  if (schemaAuthors.length > 0) {
    score += 45;
    findings.push(`Author declared in structured data: ${[...new Set(schemaAuthors)].join(", ")}.`);
  } else {
    findings.push("No `author` property in the structured data.");
  }

  if (publishers.length > 0) {
    score += 20;
    findings.push(`Publisher declared: ${[...new Set(publishers)].join(", ")}.`);
  } else {
    findings.push("No `publisher` property in the structured data.");
  }

  // A visible byline matters independently — it is what a human verifier checks.
  const metaAuthor = $('meta[name="author" i]').attr("content")?.trim();
  if (metaAuthor) {
    score += 10;
    findings.push(`<meta name="author" content="${metaAuthor}">.`);
  }

  const bylineText = $(BYLINE_SELECTOR).first().text().replace(/\s+/g, " ").trim();
  if (bylineText.length > 0 && bylineText.length < 200) {
    score += 15;
    findings.push(`Visible byline on the page: "${bylineText.slice(0, 80)}".`);
  } else {
    findings.push("No visible byline element found.");
  }

  // A Person node with sameAs/url links is what makes the author verifiable.
  const linkedAuthor = personNodes.some(
    (node) => "sameAs" in node || "url" in node,
  );
  if (linkedAuthor) {
    score += 10;
    findings.push("The author Person node links out (`url` or `sameAs`), making the identity verifiable.");
  } else if (personNodes.length > 0) {
    findings.push("The author Person node has no `url` or `sameAs` links to corroborate the identity.");
  }

  return result({
    id: "author-info",
    label: "Author and publisher attribution",
    category: "authority",
    score,
    weight: 6,
    findings,
    fix:
      score >= 80
        ? "Attribution is clear. Keep the author's `sameAs` links pointing at profiles you control."
        : "Name a real author in both the visible byline and the Article JSON-LD, as a Person node with `url` and `sameAs` links, and set `publisher` to your Organization.",
  });
};

export default checkAuthorInfo;
