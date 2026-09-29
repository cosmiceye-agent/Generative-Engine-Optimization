import { ImageResponse } from "next/og";
import { getGuide, getGuideSlugs } from "@/lib/guides";
import { site } from "@/lib/site";

export const alt = "Envoyix guide";
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
  const title = guide?.title ?? "Envoyix";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0d",
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
              background: "#8aa8ff",
            }}
          >
            <svg width="27" height="27" viewBox="0 0 32 32" fill="none">
              <circle cx="10.5" cy="16" r="2.6" fill="#0b0b0d" />
              <path
                d="M16 10.5a8 8 0 0 1 0 11"
                stroke="#0b0b0d"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M21 7a13 13 0 0 1 0 18"
                stroke="#0b0b0d"
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
          </div>
          <div style={{ display: "flex", color: "#9b9a92", fontSize: "26px" }}>
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
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </div>

        {/* Satori lays out each child as a flex item, so the footer is built as
            one string rather than three adjacent text nodes. */}
        <div style={{ display: "flex", color: "#8aa8ff", fontSize: "24px" }}>
          {`${site.url.replace(/^https?:\/\//, "")}/learn/${slug}`}
        </div>
      </div>
    ),
    size,
  );
}
