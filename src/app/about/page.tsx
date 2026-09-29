import type { Metadata } from "next";
import Link from "next/link";
import type { AboutPage, WithContext } from "schema-dts";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { CHECKS } from "@/lib/geo/registry";
import { AI_BOTS } from "@/lib/geo/robots-txt";
import { USER_AGENT, FETCH_TIMEOUT_MS, MAX_BODY_BYTES, MAX_REDIRECTS } from "@/lib/geo/fetcher";
import { PageHeader } from "@/components/PageHeader";

const description =
  "Envoyix is a free, open audit tool that scores any public URL on how readily AI answer engines can crawl, understand and cite it. Here is how it works and what it does with your data.";

export const metadata: Metadata = {
  title: "About Envoyix",
  description,
  alternates: { canonical: "/about" },
  openGraph: { type: "website", url: `${site.url}/about`, title: "About Envoyix", description },
};

const aboutPage: WithContext<AboutPage> = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Envoyix",
  url: `${site.url}/about`,
  description,
  isPartOf: { "@id": `${site.url}/#website` },
  publisher: { "@id": `${site.url}/#organization` },
};

export default function AboutPage_() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd data={aboutPage} />

      <PageHeader eyebrow="About" title="About Envoyix">
        Envoyix is a free audit tool that fetches any public URL and scores it across{" "}
        {CHECKS.length} checks measuring how readily an AI answer engine could crawl, understand and
        cite it. It runs on request, keeps no database and needs no account.
      </PageHeader>

      <div className="prose-geo mt-10">

        <h2>How does the audit work?</h2>
        <p>
          When you submit a URL, Envoyix fetches four things: the page itself plus{" "}
          <code>/robots.txt</code>, <code>/llms.txt</code> and <code>/sitemap.xml</code> from the
          same origin. All four go out at once — the three sibling files sit at fixed paths, so there
          is no reason to wait for the page first. If the page then redirects to a different origin,
          the siblings are re-fetched from wherever it actually landed, because that is the site an
          engine would index. The HTML is parsed once into a shared context object, and each check is
          a pure function of that object. No check performs its own network I/O, which is what makes
          every one of them unit-testable against a fixed HTML fixture.
        </p>
        <p>
          Each check returns a score from 0 to 100 and declares a weight. The overall score is the
          weighted average; category scores are the weighted average within each category. Findings
          are sorted by <strong>impact</strong> — weight multiplied by the gap to 100 — so the list
          you see is ordered by how many overall points each fix would actually recover.
        </p>

        <h2>Which crawlers does it check?</h2>
        <p>
          Nine, weighted by how much each one affects your chance of being cited. A bot that fetches
          pages to answer a live question matters more than one building a training corpus, so
          blocking <code>CCBot</code> costs you far less than blocking <code>OAI-SearchBot</code>.
        </p>
        <div className="overflow-x-auto">
          <table>
            <caption className="sr-only">AI crawlers checked by Envoyix</caption>
            <thead>
              <tr>
                <th scope="col">User agent</th>
                <th scope="col">Operator</th>
                <th scope="col">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {AI_BOTS.map((bot) => (
                <tr key={bot.token}>
                  <td><code>{bot.token}</code></td>
                  <td>{bot.operator}</td>
                  <td>{bot.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>How does Envoyix identify itself?</h2>
        <p>
          Requests are sent with this user agent:
        </p>
        <pre><code>{USER_AGENT}</code></pre>
        <p>
          Each fetch times out after {FETCH_TIMEOUT_MS / 1000} seconds, follows at most{" "}
          {MAX_REDIRECTS} redirects, and reads at most {MAX_BODY_BYTES / 1024 / 1024} MB of body. If
          you would rather Envoyix did not fetch your site, disallow{" "}
          <code>EnvoyixBot</code> in your robots.txt.
        </p>

        <h2>What happens to the URLs I submit?</h2>
        <p>
          Nothing is written to disk and nothing goes into a database. A finished report is held in
          the server&rsquo;s memory for 60 seconds, so that a refresh or a second person auditing the
          same URL is served instantly instead of re-fetching the site; after that it is discarded.
          There is no account system, no analytics on submitted URLs, and no third party receives
          them — unless you explicitly enable the optional AI review step on your own deployment,
          which sends the extracted page text to the Anthropic API using your own API key.
        </p>

        <h2>What are the limits of this tool?</h2>
        <ul>
          <li>
            It reads the HTML a server returns to a plain HTTP client. It does not execute
            JavaScript — deliberately, since that is what most AI crawlers do too — so a
            client-rendered page scores as an AI crawler would see it.
          </li>
          <li>
            Scores are heuristics, not a published ranking formula. No answer engine documents how
            it selects sources; the weights here encode what is publicly known plus reasonable
            inference, and they are visible in the source of every check.
          </li>
          <li>
            A high score means a page is structurally ready to be cited. It does not guarantee
            citation, which also depends on the query, the competition and the engine.
          </li>
          <li>
            Sites behind authentication, aggressive bot protection, or a geographic block will fail
            to fetch. That is information too — those barriers apply to AI crawlers as well.
          </li>
        </ul>

        <h2>Is Envoyix itself GEO-optimised?</h2>
        <p>
          It ought to be, given what it grades. The site server-renders every page, publishes{" "}
          <Link href="/llms.txt">llms.txt</Link> and{" "}
          <Link href="/llms-full.txt">llms-full.txt</Link>, ships JSON-LD on every route, and names
          the AI crawlers explicitly in its robots.txt. Point the analyzer at this page and see.
        </p>
      </div>
    </div>
  );
}
