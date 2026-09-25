import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

/**
 * Guide loading.
 *
 * Guides are MDX files on disk rather than rows in a CMS so that the Markdown
 * source can be served verbatim at /llms-full.txt — an AI crawler gets the clean
 * text with none of the surrounding chrome. Frontmatter is validated with Zod at
 * read time so a malformed guide fails the build rather than rendering blank.
 */

const GUIDES_DIR = path.join(process.cwd(), "src", "content", "guides");

const FrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(50).max(300),
  /** One-sentence answer used as the direct-answer opening and in llms.txt. */
  summary: z.string().min(1),
  datePublished: z.iso.date(),
  dateModified: z.iso.date(),
  author: z.string().min(1),
  /** Ordering on the /learn index — lower comes first. */
  order: z.number().int(),
  keywords: z.array(z.string()).default([]),
  faq: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .default([]),
  sources: z
    .array(z.object({ label: z.string().min(1), url: z.string().url() }))
    .default([]),
});

export type GuideFrontmatter = z.infer<typeof FrontmatterSchema>;

export type Guide = GuideFrontmatter & {
  slug: string;
  /** Raw MDX body, frontmatter stripped. */
  content: string;
  readingMinutes: number;
};

function estimateReadingMinutes(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export async function getGuideSlugs(): Promise<string[]> {
  const entries = await fs.readdir(GUIDES_DIR);
  return entries.filter((name) => name.endsWith(".mdx")).map((name) => name.replace(/\.mdx$/, ""));
}

export async function getGuide(slug: string): Promise<Guide | null> {
  // Reject traversal before touching the filesystem — `slug` comes from the URL.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  let raw: string;
  try {
    raw = await fs.readFile(path.join(GUIDES_DIR, `${slug}.mdx`), "utf8");
  } catch {
    return null;
  }

  const parsed = matter(raw);
  const frontmatter = FrontmatterSchema.safeParse(parsed.data);
  if (!frontmatter.success) {
    throw new Error(
      `Invalid frontmatter in ${slug}.mdx: ${frontmatter.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
    );
  }

  return {
    ...frontmatter.data,
    slug,
    content: parsed.content.trim(),
    readingMinutes: estimateReadingMinutes(parsed.content),
  };
}

export async function getAllGuides(): Promise<Guide[]> {
  const slugs = await getGuideSlugs();
  const guides = await Promise.all(slugs.map((slug) => getGuide(slug)));
  return guides
    .filter((guide): guide is Guide => guide !== null)
    .sort((a, b) => a.order - b.order);
}
