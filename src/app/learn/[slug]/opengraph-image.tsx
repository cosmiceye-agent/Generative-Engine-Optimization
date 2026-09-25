import { ImageResponse } from "next/og";
import { getGuide, getGuideSlugs } from "@/lib/guides";
import { site } from "@/lib/site";

export const alt = "GEO Lens guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Prerender one card per guide instead of generating them on demand. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * Per-guide social card. `params` is a Promise in Next.js 16 — the image
 * generation function receives async params like every other route.
 */
export default async function GuideOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  const title = guide?.title ?? "GEO Lens";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080b14",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "11px",
              background: "#818cf8",
              color: "#0b1020",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            GL
          </div>
          <div style={{ display: "flex", color: "#94a3b8", fontSize: "26px" }}>
            {`${site.name} · Guide`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: title.length > 48 ? "56px" : "66px",
            fontWeight: 700,
            lineHeight: 1.14,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {/* Satori lays out each child as a flex item, so the footer is built as
            one string rather than three adjacent text nodes. */}
        <div style={{ display: "flex", color: "#818cf8", fontSize: "24px" }}>
          {`${site.url.replace(/^https?:\/\//, "")}/learn/${slug}`}
        </div>
      </div>
    ),
    size,
  );
}
