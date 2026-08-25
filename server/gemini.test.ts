import { describe, expect, it } from "vitest";
import { askCropCompanion } from "./cropAssistant";

describe("Gemini companion credential", () => {
  it("can authenticate a lightweight models request with the configured server-side key", async () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key).toBeTruthy();
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key ?? "")}`);
    expect(response.ok).toBe(true);
  }, 20_000);

  it("returns a live contextual Saarthi response through Gemini", async () => {
    const result = await askCropCompanion("What should I observe before a crop photo check?", {
      activeScreen: "diagnose",
      farmName: "Validation Farm",
      crop: "Wheat",
      locationLabel: "Private test location",
      screenSummary: "Crop diagnosis view with camera and saved-photo review available.",
    });
    expect(result.mode).toBe("live");
    expect(result.answer.length).toBeGreaterThan(20);
  }, 30_000);
});
