import type { AnalysisReport, CheckFn, CheckResult, PageContext } from "./types";
import { gradeFromScore, scoreByCategory, sortByImpact, weightedAverage } from "./scoring";

import aiBotAccess from "./checks/crawlability/ai-bot-access";
import llmsTxt from "./checks/crawlability/llms-txt";
import sitemap from "./checks/crawlability/sitemap";
import httpStatus from "./checks/crawlability/http-status";
import serverRenderedContent from "./checks/crawlability/server-rendered-content";
import metaRobots from "./checks/crawlability/meta-robots";

import headings from "./checks/structure/headings";
import questionHeadings from "./checks/structure/question-headings";
import listsAndTables from "./checks/structure/lists-and-tables";
import paragraphLength from "./checks/structure/paragraph-length";
import faqSection from "./checks/structure/faq-section";

import jsonLd from "./checks/authority/json-ld";
import authorInfo from "./checks/authority/author-info";
import dates from "./checks/authority/dates";
import outboundCitations from "./checks/authority/outbound-citations";
import canonical from "./checks/authority/canonical";

import directAnswer from "./checks/content/direct-answer";
import statisticsDensity from "./checks/content/statistics-density";
import quotableDefinitions from "./checks/content/quotable-definitions";
import readability from "./checks/content/readability-score";
import metaDescription from "./checks/content/meta-description";
import openGraph from "./checks/content/open-graph";

/**
 * Every check, in the order they run. Adding a check means writing the module and
 * adding one line here — nothing else in the pipeline needs to change, because
 * weights are declared by the checks themselves.
 */
export const CHECKS: readonly CheckFn[] = [
  // crawlability — can an engine fetch and read the page at all?
  httpStatus,
  aiBotAccess,
  metaRobots,
  serverRenderedContent,
  sitemap,
  llmsTxt,

  // structure — can it find the answer inside the page?
  headings,
  questionHeadings,
  faqSection,
  listsAndTables,
  paragraphLength,

  // authority — is there a reason to trust and attribute it?
  jsonLd,
  authorInfo,
  dates,
  outboundCitations,
  canonical,

  // content — is the prose itself quotable?
  directAnswer,
  quotableDefinitions,
  statisticsDensity,
  readability,
  metaDescription,
  openGraph,
];

/**
 * Run every check against a page context.
 *
 * A check that throws must not take the whole report down — a single unexpected
 * DOM shape should cost one check, not the analysis — so failures are caught and
 * surfaced as a zero-weight result that the user can see but that cannot skew the
 * overall score.
 */
export function runChecks(ctx: PageContext): CheckResult[] {
  const results: CheckResult[] = [];

  for (const check of CHECKS) {
    try {
      results.push(check(ctx));
    } catch (error) {
      results.push({
        id: "internal-error",
        label: "Check failed to run",
        category: "content",
        score: 0,
        weight: 0, // zero weight keeps a crashed check out of the average
        status: "warn",
        findings: [
          `A check threw an error on this page: ${error instanceof Error ? error.message : String(error)}`,
        ],
        fix: "This is a bug in Envoyix rather than a problem with the page. Please report the URL.",
      });
    }
  }

  return results;
}

export function buildReport(ctx: PageContext): AnalysisReport {
  const checks = runChecks(ctx);
  const overallScore = weightedAverage(checks);

  return {
    requestedUrl: ctx.requestedUrl,
    finalUrl: ctx.finalUrl,
    fetchedAt: ctx.fetchedAt,
    httpStatus: ctx.status,
    overallScore,
    grade: gradeFromScore(overallScore),
    categories: scoreByCategory(checks),
    checks: sortByImpact(checks),
  };
}
