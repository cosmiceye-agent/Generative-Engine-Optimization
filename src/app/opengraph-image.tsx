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
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#818cf8",
              color: "#0b1020",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            GL
          </div>
          <div style={{ color: "#e7ecf5", fontSize: "30px", fontWeight: 600 }}>{site.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}
          >
            See your page the way
          </div>
          <div
            style={{
              color: "#818cf8",
              fontSize: "68px",
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}
          >
            AI answer engines do
          </div>
        </div>

        <div style={{ display: "flex", color: "#94a3b8", fontSize: "26px" }}>
          Generative Engine Optimization audit · 22 checks · free
        </div>
      </div>
    ),
    size,
  );
}
