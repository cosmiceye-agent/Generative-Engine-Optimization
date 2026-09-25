import type { CheckFn } from "../../types";
import { result, scale } from "../helpers";

/**
 * Does the answer exist in the HTML the server sent?
 *
 * This is the check most client-rendered sites fail. Most AI crawlers — unlike
 * Googlebot — do not execute JavaScript: they read the raw response and move on.
 * A React app that ships an empty `<div id="root">` is, to them, a blank page.
 *
 * The signal is the ratio of readable text to total payload, cross-checked
 * against the classic empty-mount-point markers.
 */
const MOUNT_POINTS = ["#root", "#__next", "#app", "#___gatsby", "[data-reactroot]", "#nuxt", "#svelte"];

const checkServerRenderedContent: CheckFn = (ctx) => {
  const findings: string[] = [];
  const { $ } = ctx;

  const textLength = ctx.text.length;
  const scriptBytes = $("script")
    .toArray()
    .reduce((total, node) => total + ($(node).html()?.length ?? 0), 0);

  // An empty (or near-empty) framework mount point with lots of script is the
  // definitive client-only fingerprint.
  const emptyMounts = MOUNT_POINTS.filter((selector) => {
    const node = $(selector).first();
    return node.length > 0 && (node.text().trim().length < 50);
  });

  const paragraphs = $("p").length;
  const headings = $("h1, h2, h3").length;

  let score: number;

  if (textLength < 200) {
    score = 0;
    findings.push(
      `Only ${textLength} characters of readable text are present in the server HTML.`,
    );
  } else {
    // 200 chars is the floor, 2,000 chars is a comfortably substantial page.
    score = scale(textLength, 200, 2000);
    findings.push(`${textLength.toLocaleString("en-US")} characters of readable text in the raw HTML.`);
  }

  if (emptyMounts.length > 0) {
    score = Math.min(score, 20);
    findings.push(
      `Found an empty client-side mount point (${emptyMounts.join(", ")}) — the content is rendered by JavaScript after load.`,
    );
  }

  if (headings === 0 && paragraphs === 0) {
    score = Math.min(score, 15);
    findings.push("No <p> or heading elements in the server HTML at all.");
  } else {
    findings.push(`Server HTML contains ${headings} heading(s) and ${paragraphs} paragraph(s).`);
  }

  if (ctx.htmlBytes > 0) {
    const ratio = scriptBytes / ctx.htmlBytes;
    findings.push(
      `Inline script is ${(ratio * 100).toFixed(0)}% of the ${(ctx.htmlBytes / 1024).toFixed(0)} KB response.`,
    );
    if (ratio > 0.6 && textLength < 1000) {
      score = Math.min(score, 35);
      findings.push("Most of the payload is script rather than content.");
    }
  }

  if ($("noscript").text().trim().length > 200) {
    score = Math.min(100, score + 10);
    findings.push("A <noscript> fallback with real content is present.");
  }

  return result({
    id: "server-rendered-content",
    label: "Content present without JavaScript",
    category: "crawlability",
    score,
    weight: 10,
    findings,
    fix:
      score >= 80
        ? "Keep rendering the main content on the server — this is what makes the page quotable."
        : "Server-render or statically generate the main content. Most AI crawlers do not run JavaScript, so anything injected client-side is invisible to them.",
  });
};

export default checkServerRenderedContent;
