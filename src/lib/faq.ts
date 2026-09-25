/**
 * The site FAQ, defined once so the rendered page and the FAQPage JSON-LD can
 * never drift apart — a common cause of structured data that contradicts the
 * visible content.
 */
export type FaqEntry = { question: string; answer: string };

export const FAQ: FaqEntry[] = [
  {
    question: "What is Generative Engine Optimization (GEO)?",
    answer:
      "Generative Engine Optimization is the practice of structuring web content so that AI answer engines — ChatGPT, Perplexity, Claude, Gemini and Google AI Overviews — can crawl it, understand it, and cite it as a source. Where SEO competes for a position in a ranked list of links, GEO competes to be the passage quoted inside a single generated answer.",
  },
  {
    question: "How is the GEO score calculated?",
    answer:
      "Each of the checks returns a score from 0 to 100 and carries a weight reflecting how much it affects your chance of being cited. The overall score is the weighted average of every check: the sum of score times weight, divided by the sum of weights. Category scores are the same calculation applied within each category.",
  },
  {
    question: "Why are some checks weighted more heavily than others?",
    answer:
      "Because the checks are not equally consequential. A robots.txt rule blocking OAI-SearchBot makes every other check irrelevant, so it carries a weight of 10. A missing og:image costs a little polish, so it carries a weight of 3. Weights are declared by each check module, which means adding a new check cannot silently rescale the existing ones.",
  },
  {
    question: "Does GEO Lens execute JavaScript when it analyses a page?",
    answer:
      "No, and that is deliberate. Most AI crawlers read the raw HTML response without running JavaScript, so rendering the page first would give you a flattering score that does not reflect what those crawlers actually see. If your content only appears after a JavaScript bundle runs, GEO Lens reports it as missing — because to an answer engine, it is.",
  },
  {
    question: "Will a high GEO score guarantee that AI engines cite my page?",
    answer:
      "No. A high score means the page is structurally ready to be cited: reachable, parseable, well-attributed and quotable. Whether it is actually cited for a given question also depends on the query, the competing sources, and each engine's own selection process, none of which is public. Think of the score as removing the obstacles rather than winning the race.",
  },
  {
    question: "Should I block AI crawlers in robots.txt?",
    answer:
      "It depends which ones, and it is a legitimate editorial choice either way. Training crawlers such as GPTBot, CCBot and Google-Extended build model corpora. Retrieval bots such as OAI-SearchBot, PerplexityBot, ChatGPT-User and Claude-User fetch pages to answer a question right now, with attribution. Blocking the retrieval bots removes you from cited answers. Blocking the training crawlers does not, so many sites allow retrieval and disallow training.",
  },
  {
    question: "What is llms.txt and do I need one?",
    answer:
      "llms.txt is an emerging convention — a Markdown file at your site root that points language models at the canonical, clean versions of your key pages. It is not yet universally supported, so GEO Lens treats it as a modest bonus rather than a requirement. The cost is one file, and the downside is nil.",
  },
  {
    question: "Does GEO Lens store the URLs I submit?",
    answer:
      "No. Each audit is a live fetch, the report is rendered into the response, and nothing is written to disk or a database. There is no account system and no analytics on submitted URLs.",
  },
  {
    question: "Why did my page fail to fetch?",
    answer:
      "The most common causes are bot protection (Cloudflare and similar services often challenge unknown user agents), a login requirement, a geographic block, a redirect chain longer than three hops, a response over 5 MB, or a server slower than the 10-second timeout. Each of those is also a barrier for AI crawlers, so a failed fetch is itself a finding.",
  },
  {
    question: "How often should I re-run an audit?",
    answer:
      "After any deploy that changes templates, robots.txt, or the rendering strategy, and then periodically — monthly is reasonable for an active site. Crawlability fixes show up in a re-audit immediately; the effect on actual citations depends on each engine re-crawling and re-embedding the page.",
  },
];
