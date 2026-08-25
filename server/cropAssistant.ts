import { invokeLLM } from "./_core/llm";

export type CropCompanionContext = {
  farmName?: string;
  crop?: string;
  locationLabel?: string;
  activeScreen?: "home" | "diagnose" | "market" | "intelligence" | "farms" | "settings";
  screenSummary?: string;
};

export type CropCompanionResponse = {
  answer: string;
  mode: "live" | "fallback";
};

export function cropCompanionFallback(question: string, context?: CropCompanionContext | null) {
  const crop = context?.crop ? ` for your ${context.crop} crop` : "";
  return `I saved your question${crop}. I cannot reach the live crop companion right now, so please inspect the field in daylight, note whether the issue is spreading, and share a clear photo with a qualified local agronomist if plants are worsening. You can try again when your connection returns.`;
}

export function extractGeminiText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> }).candidates;
  const text = candidates?.[0]?.content?.parts?.map(part => typeof part.text === "string" ? part.text : "").join("\n").trim();
  return text || null;
}

export async function askCropCompanion(question: string, context?: CropCompanionContext | null): Promise<CropCompanionResponse> {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Gemini key is unavailable");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You are Saarthi, a calm crop companion for Indian smallholder farmers. Give short, plain-language, practical answers. You receive a minimal application context, not the farmer's full screen or hidden account data. Do not identify a disease with certainty from text alone, prescribe pesticides, active ingredients, doses, brands, or mixtures; guarantee prices, yields, or sale outcomes; or replace a local agronomist. State what to observe next. When symptoms spread, look severe, or the context is incomplete, recommend qualified local expert review. Never claim you saw an image unless an image was actually supplied." }],
        },
        contents: [{ role: "user", parts: [{ text: `Active workspace: ${context?.activeScreen ?? "general"}.\nVisible screen summary: ${context?.screenSummary ?? "No screen details shared"}.\nSelected farm: ${context?.farmName ?? "not selected"}.\nCrop: ${context?.crop ?? "not selected"}.\nLocation label: ${context?.locationLabel ?? "not shared"}.\n\nFarmer question: ${question}` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 520 },
      }),
    });
    if (!response.ok) throw new Error("Gemini response failed");
    const answer = extractGeminiText(await response.json());
    if (!answer) throw new Error("Gemini answer was empty");
    return { answer, mode: "live" };
  } catch {
    return { answer: cropCompanionFallback(question, context), mode: "fallback" };
  }
}

export type PhotoAssessment = {
  status: "complete" | "review" | "retake";
  title: string;
  confidence: "high" | "medium" | "low";
  summary: string;
  evidence: string[];
  actions: string[];
};

export function photoAssessmentFallback() : PhotoAssessment {
  return {
    status: "review",
    title: "Photo saved — disease signal needs a clearer check",
    confidence: "low",
    summary: "The live image review is unavailable right now, so no disease or crop-quality claim has been made from this photo.",
    evidence: ["A crop photo was received", "No live visual assessment was returned"],
    actions: ["Photo next step: retake in daylight if blurry", "Irrigation: avoid changing water quantity until the field is inspected", "Soil check: note recent fertiliser, rain, and drainage conditions", "Treatment: ask a qualified local agronomist before selecting any organic or chemical product"],
  };
}

export async function assessCropPhoto(imageUrl: string, crop: string): Promise<PhotoAssessment> {
  try {
    const response = await invokeLLM({
      model: "gemini-3-flash-preview",
      maxTokens: 900,
      messages: [
        { role: "system", content: "You are AgroSaarthi's crop-photo visible-signs and advisory assistant for Indian smallholder farmers. You may name a POSSIBLE disease signal only when visible signs support it, and you must call it a possible signal rather than a diagnosis. Never prescribe pesticide names, active ingredients, doses, brands, or mixtures. Do not promise yield or recovery. Give short, actionable categories: photo next step, organic/IPM discussion with an expert, chemical/product safety discussion with an expert, irrigation observation, and soil-health observation. Recommend a qualified local agronomist promptly for spreading, severe, or uncertain symptoms." },
        { role: "user", content: [{ type: "text", text: `Review this ${crop} crop image. Use the title to state either “Possible [signal] — confirm locally” or “Image needs a clearer field check”. Provide visible evidence and advisory actions labelled Organic/IPM, Treatment safety, Irrigation, and Soil health when the photo supports practical next steps. Return only the requested JSON.` }, { type: "image_url", image_url: { url: imageUrl, detail: "high" } }] },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "crop_photo_quality_check",
          strict: true,
          schema: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["complete", "review", "retake"] },
              title: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              summary: { type: "string" },
              evidence: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
              actions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            },
            required: ["status", "title", "confidence", "summary", "evidence", "actions"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") return photoAssessmentFallback();
    return JSON.parse(content) as PhotoAssessment;
  } catch {
    return photoAssessmentFallback();
  }
}
