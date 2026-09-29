import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social card for the site.
 *
 * Rendered by next/og at build time (and cached at the edge thereafter), so
 * there is no design tool in the loop and the card can never fall out of sync
 * with the site's own name and tagline.
 *
 * The mark is drawn as inline SVG rather than imported from icon.svg: Satori
 * renders a constrained subset of CSS/SVG, and keeping the geometry here means
 * the card cannot break if the favicon is later redrawn.
 */
export default function OpengraphImage() {
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
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "13px",
              background: "#8aa8ff",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
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
          <div style={{ color: "#f1f0ec", fontSize: "32px", fontWeight: 600 }}>{site.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
            }}
          >
            See your page the way
          </div>
          <div
            style={{
              color: "#8aa8ff",
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
            }}
          >
            AI answer engines do
          </div>
        </div>

        <div style={{ display: "flex", color: "#9b9a92", fontSize: "26px" }}>
          Generative Engine Optimization audit · 22 checks · free
        </div>
      </div>
    ),
    size,
  );
}
