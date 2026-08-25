import { describe, expect, it } from "vitest";
import { decodeAudioDataUrl } from "./routers";

describe("decodeAudioDataUrl", () => {
  it("accepts a standard browser WebM recording with a codec parameter", () => {
    const audio = decodeAudioDataUrl("data:audio/webm;codecs=opus;base64,AAECAw==");
    expect(audio.mimeType).toBe("audio/webm");
    expect(audio.bytes.length).toBeGreaterThan(0);
  });

  it("rejects unsupported audio data", () => {
    expect(() => decodeAudioDataUrl("data:text/plain;base64,SGVsbG8=")).toThrow("WEBM");
  });
});
