import { describe, expect, it } from "vitest";
import { cropCompanionFallback, photoAssessmentFallback } from "./cropAssistant";

describe("cropCompanionFallback", () => {
  it("keeps a crop-specific offline fallback cautious and useful", () => {
    const result = cropCompanionFallback("Why are the leaves yellow?", { crop: "Soyabean" });
    expect(result).toContain("Soyabean");
    expect(result).toContain("qualified local agronomist");
  });

  it("returns an explicitly cautious image-review fallback when AI is unavailable", () => {
    const result = photoAssessmentFallback();
    expect(result.confidence).toBe("low");
    expect(result.summary).toContain("no disease or crop-quality claim");
  });
});
