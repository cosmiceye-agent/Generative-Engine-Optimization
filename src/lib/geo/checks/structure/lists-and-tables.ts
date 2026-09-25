import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * Lists and tables survive extraction.
 *
 * When a model assembles an answer it frequently lifts an entire list or table
 * row intact, because the markup already states the relationship between the
 * items. The same facts written as a flowing paragraph have to be re-derived, and
 * usually are not.
 */
const checkListsAndTables: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];

  // Ignore nav-like lists: a <ul> of links in a header is chrome, not content.
  const contentLists = $("ul, ol")
    .toArray()
    .filter((node) => {
      const list = $(node);
      if (list.closest("nav, header, footer, [role='navigation']").length > 0) return false;
      const items = list.children("li");
      if (items.length < 2) return false;
      // A list whose items are almost entirely link text is a menu.
      const text = list.text().trim().length;
      const linkText = list.find("a").text().trim().length;
      return text > 0 && linkText / text < 0.8;
    });

  const tables = $("table")
    .toArray()
    .filter((node) => $(node).find("tr").length >= 2);

  const definitionLists = $("dl").toArray().filter((node) => $(node).find("dt").length > 0);

  let score = 0;

  if (contentLists.length > 0) {
    // Up to 70 from lists alone: a prose page that enumerates well can pass on
    // lists without inventing tabular data it does not have.
    score += Math.min(70, 40 + (contentLists.length - 1) * 15);
    const items = contentLists.reduce((total, node) => total + $(node).children("li").length, 0);
    findings.push(`${contentLists.length} content list(s) with ${items} items total.`);
  } else {
    findings.push("No content lists — every enumerable fact is buried in prose.");
  }

  if (tables.length > 0) {
    // Up to 45, awarded for markup quality rather than deducted for its absence,
    // so the score reads the same way the findings do.
    score += 30;
    const hasHeaders = tables.some((node) => $(node).find("th").length > 0);
    findings.push(
      `${tables.length} data table(s)${hasHeaders ? " with <th> header cells" : " — but no <th> header cells, so columns are unlabelled"}.`,
    );
    if (hasHeaders) score += 10;

    const captioned = tables.filter((node) => $(node).find("caption").length > 0).length;
    if (captioned > 0) {
      score += 5;
      findings.push(`${captioned} table(s) have a <caption> describing the data.`);
    }
  } else {
    findings.push("No data tables.");
  }

  if (definitionLists.length > 0) {
    score += 10;
    findings.push(`${definitionLists.length} definition list(s) — an ideal shape for term/meaning pairs.`);
  }

  // A long page with no structured block at all is the real failure mode.
  if (score === 0 && ctx.text.length > 1500) {
    findings.push(`${ctx.text.length.toLocaleString("en-US")} characters of unbroken prose with no list or table.`);
  }

  return result({
    id: "lists-and-tables",
    label: "Lists and tables",
    category: "structure",
    score,
    weight: 5,
    findings,
    fix:
      score >= 80
        ? "Keep using lists and tables for enumerable facts — they get lifted into answers intact."
        : "Convert enumerations into <ul>/<ol>, and comparisons into a <table> with <th> headers and a <caption>.",
  });
};

export default checkListsAndTables;
