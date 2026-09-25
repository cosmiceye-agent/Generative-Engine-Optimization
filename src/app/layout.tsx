import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { Organization, WebSite, WithContext } from "schema-dts";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { ThemeScript } from "@/components/ThemeScript";
import { site } from "@/lib/site";

// next/font self-hosts the files and inlines the @font-face rules, so there is
// no render-blocking request to Google and no layout shift on load.
const sans = Inter({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author.name, url: site.author.url }],
  keywords: [
    "generative engine optimization",
    "GEO",
    "AI SEO",
    "AI search optimization",
    "llms.txt",
    "AI citations",
    "ChatGPT SEO",
    "Perplexity SEO",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: site.url,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
  },
};

/**
 * Organization and WebSite belong on the root layout: they describe the site as
 * a whole, so every page carries them, and page-specific types (Article,
 * FAQPage, SoftwareApplication) are added by the pages themselves.
 */
const organization: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: site.name,
  url: site.url,
  description: site.description,
  logo: {
    "@type": "ImageObject",
    url: `${site.url}/icon.svg`,
  },
};

const website: WithContext<WebSite> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  name: site.name,
  url: site.url,
  description: site.description,
  publisher: { "@id": `${site.url}/#organization` },
  inLanguage: "en",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <JsonLd data={organization} />
        <JsonLd data={website} />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
