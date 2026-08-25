import { describe, expect, it } from "vitest";
import { normalizeCedaPrices, projectMandiTrend } from "./market";

describe("normalizeCedaPrices", () => {
  it("normalizes the confirmed CEDA price response fields without inventing values", () => {
    expect(normalizeCedaPrices({ data: [{ t: "2025-10-30", p_modal: "2540.83", p_min: 2465.48, p_max: "2599.39" }] })).toEqual([
      { date: "2025-10-30", modalPrice: 2540.83, minPrice: 2465.48, maxPrice: 2599.39 },
    ]);
  });

  it("rejects rows that do not provide a timestamp", () => {
    expect(normalizeCedaPrices({ data: [{ modal_price: 2500 }] })).toEqual([]);
  });

  it("returns a bounded, explicitly non-guaranteed short-horizon trend projection from source rows", () => {
    const projection = projectMandiTrend([
      { date: "2026-01-01", modalPrice: 2000, minPrice: null, maxPrice: null },
      { date: "2026-01-02", modalPrice: 2020, minPrice: null, maxPrice: null },
      { date: "2026-01-03", modalPrice: 2035, minPrice: null, maxPrice: null },
      { date: "2026-01-04", modalPrice: 2050, minPrice: null, maxPrice: null },
    ]);
    expect(projection?.direction).toBe("up");
    expect(projection?.projected).toBeGreaterThan(2050);
    expect(projection?.lower).toBeLessThanOrEqual(projection?.upper ?? 0);
  });
});
