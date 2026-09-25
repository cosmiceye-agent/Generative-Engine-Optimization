import type { CheckFn } from "../../types";
import { extractJsonLd, typesOf, validateNode } from "../../schema";
import { result } from "../helpers";

/**
 * Structured data is the difference between an engine *inferring* what a page is
 * and being *told*. Scoring rewards having schema at all, then having the right
 * types, then having them complete — an Article node missing `author` and
 * `datePublished` cannot be attributed, so it is barely better than no schema.
 */
const HIGH_VALUE_TYPES = ["Article", "BlogPosting", "NewsArticle", "TechArticle", "FAQPage", "HowTo", "Product", "SoftwareApplication"];

const checkJsonLd: CheckFn = (ctx) => {
  const { nodes, errors } = extractJsonLd(ctx.$);
  const findings: string[] = [];

  for (const error of errors) findings.push(error);

  if (nodes.length === 0) {
    if (ctx.$('script[type="application/ld+json"]').length === 0) {
      findings.push("No JSON-LD structured data on the page.");
    }
    // Microdata/RDFa are legacy but still parsed by most engines.
    const microdata = ctx.$("[itemscope]").length;
    if (microdata > 0) {
      findings.push(`${microdata} microdata itemscope element(s) found — JSON-LD is preferred and better supported.`);
    }
    return result({
      id: "json-ld",
      label: "JSON-LD structured data",
      category: "authority",
      score: microdata > 0 ? 15 : 0,
      weight: 9,
      findings,
      fix: "Add a JSON-LD <script type=\"application/ld+json\"> block. At minimum: Organization plus the type that matches this page (Article, FAQPage, HowTo or Product).",
    });
  }

  const validations = nodes.flatMap(validateNode);
  const allTypes = [...new Set(nodes.flatMap(typesOf))];
  const recognised = [...new Set(validations.map((entry) => entry.type))];

  findings.push(`${nodes.length} JSON-LD node(s) declaring: ${allTypes.join(", ")}.`);

  // 35 points: schema exists and at least one type is recognised.
  let score = recognised.length > 0 ? 35 : 15;

  // 30 points: a high-value type for citation is present.
  const highValue = recognised.filter((type) => HIGH_VALUE_TYPES.includes(type));
  if (highValue.length > 0) {
    score += 30;
    findings.push(`Citation-relevant types present: ${highValue.join(", ")}.`);
  } else {
    findings.push(
      "No citation-relevant type (Article, FAQPage, HowTo, Product, SoftwareApplication) describes this page's content.",
    );
  }

  // 35 points: the declared types are actually complete.
  const invalid = validations.filter((entry) => !entry.valid);
  if (validations.length > 0) {
    const completeness = (validations.length - invalid.length) / validations.length;
    score += completeness * 35;
  }

  for (const entry of invalid) {
    findings.push(`${entry.type} is missing required field(s): ${entry.missingRequired.join(", ")}.`);
  }

  const incomplete = validations.filter(
    (entry) => entry.valid && entry.missingRecommended.length > 0,
  );
  for (const entry of incomplete.slice(0, 3)) {
    findings.push(`${entry.type} is valid but omits recommended field(s): ${entry.missingRecommended.join(", ")}.`);
  }
  // Recommended fields are a nudge, not a requirement — cap the deduction.
  score -= Math.min(10, incomplete.length * 3);

  if (errors.length > 0) score -= errors.length * 10;

  const unrecognised = allTypes.filter((type) => !recognised.includes(type));
  if (unrecognised.length > 0) {
    findings.push(`Types not validated by this tool: ${unrecognised.slice(0, 5).join(", ")}.`);
  }

  return result({
    id: "json-ld",
    label: "JSON-LD structured data",
    category: "authority",
    score,
    weight: 9,
    findings,
    fix:
      invalid.length > 0
        ? `Fill in the missing required fields: ${invalid.map((entry) => `${entry.type}.${entry.missingRequired.join("/")}`).join(", ")}.`
        : highValue.length === 0
          ? "Add the schema type that matches this page's content — Article for a guide, FAQPage for Q&A, HowTo for instructions, Product for a product."
          : "Structured data is in good shape. Validate it against Google's Rich Results Test when you change the template.",
  });
};

export default checkJsonLd;
