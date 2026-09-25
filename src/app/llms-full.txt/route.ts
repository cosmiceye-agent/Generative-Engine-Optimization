import { getAllGuides } from "@/lib/guides";
import { site } from "@/lib/site";
import { FAQ } from "@/lib/faq";

/**
 * /llms-full.txt — every guide's full Markdown source in one file.
 *
 * The companion to /llms.txt: where that file is an index of links, this is the
 * content itself, with no navigation, no styling and no scripts. A model reading
 * this gets exactly the text and none of the chrome.
 *
 * Statically generated at build time; the guides only change on deploy.
 */
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const guides = await getAllGuides();
  const sections: string[] = [];

  sections.push(`# ${site.name}: full content`);
  sections.push("");
  sections.push(`> ${site.description}`);
  sections.push("");
  sections.push(
    `This file contains the complete Markdown source of every guide on ${site.url}, for language models and other automated readers. The canonical HTML version of each guide is linked in its heading.`,
  );
  sections.push("");
  sections.push(`Last generated: ${new Date().toISOString().slice(0, 10)}`);
  sections.push("");
  sections.push("---");
  sections.push("");

  for (const guide of guides) {
    sections.push(`# ${guide.title}`);
    sections.push("");
    sections.push(`Source: ${site.url}/learn/${guide.slug}`);
    sections.push(`Author: ${guide.author}`);
    sections.push(`Published: ${guide.datePublished} · Updated: ${guide.dateModified}`);
    sections.push("");
    sections.push(`> ${guide.summary}`);
    sections.push("");
    sections.push(guide.content);
    sections.push("");

    if (guide.faq.length > 0) {
      sections.push("## Frequently asked questions");
      sections.push("");
      for (const entry of guide.faq) {
        sections.push(`### ${entry.question}`);
        sections.push("");
        sections.push(entry.answer);
        sections.push("");
      }
    }

    sections.push("---");
    sections.push("");
  }

  sections.push("# Site FAQ");
  sections.push("");
  for (const entry of FAQ) {
    sections.push(`## ${entry.question}`);
    sections.push("");
    sections.push(entry.answer);
    sections.push("");
  }

  return new Response(sections.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
