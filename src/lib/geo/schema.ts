import type { CheerioAPI } from "cheerio";

/**
 * JSON-LD extraction and validation.
 *
 * Schema.org types are validated against the fields that actually matter for
 * citation — the ones an engine reads to attribute an answer — not against the
 * full vocabulary. `author`, `datePublished` and `headline` on an Article change
 * whether you get named as the source; `wordCount` does not.
 */

export type JsonLdNode = Record<string, unknown>;

/** Schema types worth detecting, with the properties required to be useful. */
export const SCHEMA_REQUIREMENTS: Record<string, { required: string[]; recommended: string[] }> = {
  Organization: {
    required: ["name", "url"],
    recommended: ["logo", "sameAs", "description"],
  },
  Article: {
    required: ["headline", "author", "datePublished"],
    recommended: ["dateModified", "image", "publisher", "description"],
  },
  BlogPosting: {
    required: ["headline", "author", "datePublished"],
    recommended: ["dateModified", "image", "publisher"],
  },
  NewsArticle: {
    required: ["headline", "author", "datePublished"],
    recommended: ["dateModified", "image", "publisher"],
  },
  TechArticle: {
    required: ["headline", "author", "datePublished"],
    recommended: ["dateModified", "image", "publisher"],
  },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
  },
  HowTo: {
    required: ["name", "step"],
    recommended: ["totalTime", "supply", "tool", "image"],
  },
  Product: {
    required: ["name"],
    recommended: ["description", "image", "offers", "brand", "aggregateRating"],
  },
  BreadcrumbList: {
    required: ["itemListElement"],
    recommended: [],
  },
  WebSite: {
    required: ["name", "url"],
    recommended: ["potentialAction", "description"],
  },
  SoftwareApplication: {
    required: ["name", "applicationCategory"],
    recommended: ["operatingSystem", "offers", "description", "aggregateRating"],
  },
  Person: {
    required: ["name"],
    recommended: ["url", "sameAs", "jobTitle"],
  },
};

export type ParsedScript = {
  /** Top-level nodes found in this <script> block, with @graph already flattened. */
  nodes: JsonLdNode[];
  error?: string;
};

function isRecord(value: unknown): value is JsonLdNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Flatten a JSON-LD document into its constituent nodes.
 *
 * Handles the three shapes seen in the wild: a bare object, a top-level array,
 * and `{"@graph": [...]}`. Nested nodes are walked too, since a `publisher` or
 * `mainEntity` is itself a typed node worth validating.
 */
function collectNodes(value: unknown, out: JsonLdNode[], depth = 0): void {
  if (depth > 6) return; // guard against pathological nesting

  if (Array.isArray(value)) {
    for (const entry of value) collectNodes(entry, out, depth + 1);
    return;
  }
  if (!isRecord(value)) return;

  if ("@graph" in value) {
    collectNodes(value["@graph"], out, depth + 1);
    // A node can carry both @graph and its own @type.
  }
  if ("@type" in value) out.push(value);

  for (const [key, child] of Object.entries(value)) {
    if (key === "@graph" || key.startsWith("@")) continue;
    if (Array.isArray(child) || isRecord(child)) collectNodes(child, out, depth + 1);
  }
}

export function extractJsonLd($: CheerioAPI): { nodes: JsonLdNode[]; errors: string[] } {
  const nodes: JsonLdNode[] = [];
  const errors: string[] = [];

  $('script[type="application/ld+json"]').each((index, element) => {
    const raw = $(element).contents().text().trim();
    if (raw === "") {
      errors.push(`JSON-LD block ${index + 1} is empty.`);
      return;
    }
    try {
      collectNodes(JSON.parse(raw) as unknown, nodes);
    } catch (error) {
      errors.push(
        `JSON-LD block ${index + 1} is not valid JSON (${error instanceof Error ? error.message : "parse error"}).`,
      );
    }
  });

  return { nodes, errors };
}

/** `@type` may be a string or an array of strings. Normalise to a string array. */
export function typesOf(node: JsonLdNode): string[] {
  const raw = node["@type"];
  if (typeof raw === "string") return [raw];
  if (Array.isArray(raw)) return raw.filter((entry): entry is string => typeof entry === "string");
  return [];
}

function hasValue(node: JsonLdNode, property: string): boolean {
  const value = node[property];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export type SchemaValidation = {
  type: string;
  missingRequired: string[];
  missingRecommended: string[];
  valid: boolean;
};

export function validateNode(node: JsonLdNode): SchemaValidation[] {
  return typesOf(node)
    .filter((type) => type in SCHEMA_REQUIREMENTS)
    .map((type) => {
      const spec = SCHEMA_REQUIREMENTS[type];
      const missingRequired = spec.required.filter((property) => !hasValue(node, property));
      const missingRecommended = spec.recommended.filter((property) => !hasValue(node, property));
      return { type, missingRequired, missingRecommended, valid: missingRequired.length === 0 };
    });
}

/**
 * Index nodes by `@id` so references can be followed.
 *
 * A well-formed graph defines the Organization once and points at it from every
 * Article with `"publisher": {"@id": "…#organization"}`. Without resolving that,
 * a correctly-authored page looks like it has no publisher at all.
 */
export function indexById(nodes: readonly JsonLdNode[]): Map<string, JsonLdNode> {
  const index = new Map<string, JsonLdNode>();
  for (const node of nodes) {
    const id = node["@id"];
    // Only index nodes that carry real content, not bare references.
    if (typeof id === "string" && id && Object.keys(node).length > 1) {
      index.set(id, node);
    }
  }
  return index;
}

/**
 * Read a schema property as a display string, unwrapping
 * `{"@type":"Person","name":…}` and following `{"@id": …}` references when an
 * index of the page's other nodes is supplied.
 */
export function readName(
  value: unknown,
  index?: ReadonlyMap<string, JsonLdNode>,
): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const name = readName(entry, index);
      if (name) return name;
    }
    return null;
  }
  if (isRecord(value)) {
    const name = value["name"];
    if (typeof name === "string" && name.trim()) return name.trim();

    // A bare `{"@id": "…"}` reference — follow it if we can.
    const ref = value["@id"];
    if (index && typeof ref === "string") {
      const target = index.get(ref);
      if (target && target !== value) {
        const targetName = target["name"];
        if (typeof targetName === "string" && targetName.trim()) return targetName.trim();
      }
    }
  }
  return null;
}
