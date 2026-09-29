import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format-date";

describe("formatDate", () => {
  it("renders the same calendar day as the ISO input", () => {
    // The regression this guards: a bare new Date("2026-09-28") is midnight UTC,
    // so formatting it in any timezone behind UTC printed 27 September — one day
    // off the datetime attribute rendered beside it.
    expect(formatDate("2026-09-28")).toBe("28 September 2026");
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
    expect(formatDate("2026-12-31")).toBe("31 December 2026");
  });

  it("is stable regardless of the host timezone", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["UTC", "America/Denver", "Pacific/Kiritimati", "Asia/Kolkata"]) {
        process.env.TZ = tz;
        expect(formatDate("2026-09-28")).toBe("28 September 2026");
      }
    } finally {
      process.env.TZ = original;
    }
  });

  it("accepts a full timestamp", () => {
    expect(formatDate("2026-09-28T14:30:00Z")).toBe("28 September 2026");
  });
});
