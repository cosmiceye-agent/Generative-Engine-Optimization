import type { CheckFn } from "../../types";
import { result, scale } from "../helpers";

/**
 * Question-shaped headings match how people prompt.
 *
 * Retrieval is embedding-based: a heading that reads "How do I renew a passport?"
 * sits far closer in vector space to the user's actual question than one reading
 * "Renewals". Matching the phrasing of the query is most of the battle.
 */
const QUESTION_WORDS = /^(how|what|why|when|where|who|which|can|do|does|is|are|should|will|would|could)\b/i;

const checkQuestionHeadings: CheckFn = (ctx) => {
  const { $ } = ctx;
  const findings: string[] = [];

  const subheadings = $("h2, h3")
    .toArray()
    .map((node) => $(node).text().replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);

  if (subheadings.length === 0) {
    return result({
      id: "question-headings",
      label: "Question-style headings",
      category: "structure",
      score: 0,
      weight: 6,
      findings: ["No H2 or H3 headings to evaluate."],
      fix: "Add H2 subheadings phrased the way a reader would ask — \"How does X work?\" rather than \"Overview\".",
    });
  }

  const questions = subheadings.filter(
    (text) => text.endsWith("?") || QUESTION_WORDS.test(text),
  );
  const ratio = questions.length / subheadings.length;

  // 40% question-shaped headings is a strong page; requiring 100% would push
  // people into writing unnatural headings for reference sections.
  const score = scale(ratio, 0, 0.4);

  findings.push(
    `${questions.length} of ${subheadings.length} subheadings (${Math.round(ratio * 100)}%) are phrased as questions.`,
  );
  if (questions.length > 0) {
    findings.push(`For example: "${questions[0].slice(0, 90)}".`);
  }

  const vague = subheadings.filter((text) =>
    /^(overview|introduction|background|details|more|misc|other|about|features|benefits)$/i.test(text),
  );
  if (vague.length > 0) {
    findings.push(`Generic headings that carry no query signal: ${vague.join(", ")}.`);
  }

  return result({
    id: "question-headings",
    label: "Question-style headings",
    category: "structure",
    score: Math.max(0, score - vague.length * 5),
    weight: 6,
    findings,
    fix:
      ratio >= 0.4
        ? "Good coverage — keep phrasing new sections as the question they answer."
        : "Rewrite subheadings as the questions readers actually type, and answer each one in the first sentence beneath it.",
  });
};

export default checkQuestionHeadings;
