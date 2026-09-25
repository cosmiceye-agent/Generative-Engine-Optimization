import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { LlmReview, PageContext } from "./types";

/**
 * Optional AI rewrite step.
 *
 * Entirely opt-in: without ENABLE_LLM_REVIEW=true and an API key, this module
 * returns null and the rest of the analysis is unaffected. Everything here is
 * best-effort — a failure to reach the API must never fail an analysis that has
 * already produced 21 deterministic check results.
 */

const DEFAULT_MODEL = "claude-opus-5";

/** How much page text to send. Keeps cost bounded and stays well inside context. */
const MAX_TEXT_CHARS = 12_000;

const SuggestionSchema = z.object({
  title: z.string().describe("Short imperative label for the change, e.g. 'Lead with the definition'"),
  rationale: z
    .string()
    .describe("Why this change makes the passage more likely to be quoted by an AI answer engine"),
  rewrite: z.string().describe("The concrete rewritten text, ready to paste into the page"),
});

const ReviewSchema = z.object({
  suggestions: z.array(SuggestionSchema).min(3).max(5),
});

const SYSTEM_PROMPT = `You are a Generative Engine Optimization editor. You rewrite web copy so that AI answer engines (ChatGPT, Perplexity, Claude, Gemini, Google AI Overviews) can extract and cite it.

What makes a passage citable:
- It answers the question in its first sentence, naming the subject rather than saying "it" or "this".
- It is self-contained: lifted out of the page, it still makes sense.
- It is specific: concrete figures, dates and named sources instead of vague claims.
- It is short: under 40 words per sentence, one idea per paragraph.

Return 3 to 5 suggestions. Each must quote or closely paraphrase real text from the page and give a rewrite the author could paste in directly. Do not invent facts, statistics or sources that are not already present in the page — if a claim needs evidence the page does not have, say so in the rationale rather than fabricating a figure.`;

export function isLlmReviewEnabled(): boolean {
  return process.env.ENABLE_LLM_REVIEW === "true" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function maybeReviewWithLlm(ctx: PageContext): Promise<LlmReview | null> {
  if (!isLlmReviewEnabled()) return null;
  if (ctx.text.length < 200) return null; // nothing substantive to rewrite

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  try {
    const client = new Anthropic({
      // Keep well under the route's maxDuration so a slow call surfaces as a
      // missing review rather than a 504 on the whole analysis.
      timeout: 45_000,
      maxRetries: 1,
    });

    const title = ctx.$("title").first().text().trim();
    const text = ctx.text.slice(0, MAX_TEXT_CHARS);

    const response = await client.messages.parse({
      model,
      max_tokens: 8_000,
      system: SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(ReviewSchema) },
      messages: [
        {
          role: "user",
          content: `URL: ${ctx.finalUrl}\nTitle: ${title || "(none)"}\n\nPage text:\n\n${text}`,
        },
      ],
    });

    // A refusal or a schema mismatch both leave parsed_output null — treat either
    // as "no review available" rather than as an error.
    if (response.stop_reason === "refusal" || !response.parsed_output) return null;

    return { model, suggestions: response.parsed_output.suggestions };
  } catch (error) {
    // Deliberately swallowed: the deterministic report is the product, and this
    // step is a bonus. Log for operators, return null to callers.
    if (error instanceof Anthropic.APIError) {
      console.error(`[llm-review] Anthropic API error ${error.status}: ${error.message}`);
    } else {
      console.error("[llm-review] unexpected failure:", error);
    }
    return null;
  }
}
