import type { CheckFn } from "../../types";
import { result } from "../helpers";

/**
 * Status code, transport and cache posture. A page that answers 200 over HTTPS
 * with a sane content type is table stakes; anything else is a hard blocker that
 * no amount of good content can compensate for.
 */
const checkHttpStatus: CheckFn = (ctx) => {
  const findings: string[] = [];
  let score = 0;

  if (ctx.status >= 200 && ctx.status < 300) {
    score = 100;
    findings.push(`Responded HTTP ${ctx.status}.`);
  } else if (ctx.status >= 300 && ctx.status < 400) {
    score = 40;
    findings.push(`Responded HTTP ${ctx.status} — the URL redirects rather than serving content.`);
  } else if (ctx.status >= 400 && ctx.status < 500) {
    score = 0;
    findings.push(`Responded HTTP ${ctx.status} — crawlers will drop this URL.`);
  } else {
    score = 0;
    findings.push(`Responded HTTP ${ctx.status} — a server error; crawlers retry then give up.`);
  }

  const finalUrl = new URL(ctx.finalUrl);
  if (finalUrl.protocol !== "https:") {
    score -= 30;
    findings.push("Served over plain HTTP. Engines down-rank and sometimes refuse non-HTTPS pages.");
  }

  if (ctx.requestedUrl !== ctx.finalUrl) {
    findings.push(`Redirected to ${ctx.finalUrl}. Make sure that is the URL you link and canonicalise to.`);
  }

  const contentType = ctx.headers["content-type"] ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
    score -= 20;
    findings.push(`Content-Type is "${contentType || "not set"}" rather than text/html.`);
  }

  if (!/charset=/i.test(contentType) && !/<meta[^>]+charset=/i.test(ctx.html)) {
    findings.push("No character encoding declared — parsers have to guess.");
    score -= 5;
  }

  return result({
    id: "http-status",
    label: "HTTP response health",
    category: "crawlability",
    score,
    weight: 8,
    findings,
    fix:
      ctx.status >= 200 && ctx.status < 300 && finalUrl.protocol === "https:"
        ? "Nothing to change — keep returning 200 over HTTPS with an explicit charset."
        : "Serve the page as HTTPS with a 200 status and `Content-Type: text/html; charset=utf-8`.",
  });
};

export default checkHttpStatus;
