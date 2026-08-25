import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import {
  createDiagnosisForOwner,
  createFarmForOwner,
  createHarvestIntentForOwner,
  getDiagnosisForOwner,
  getFarmForOwner,
  listDiagnosesForOwner,
  listFarmsForOwner,
  listHarvestIntentsForOwner,
  updateFarmForOwner,
  updateDiagnosisForOwner,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getCedaLatestPrice, getCedaPriceForecast } from "./market";
import { storageGetSignedUrl, storagePut } from "./storage";
import { askCropCompanion, assessCropPhoto } from "./cropAssistant";
import { transcribeAudio } from "./_core/voiceTranscription";

const farmInput = z.object({
  name: z.string().trim().min(2).max(120),
  crop: z.string().trim().min(2).max(120),
  cedaCommodityId: z.number().int().positive().nullable(),
  areaAcres: z.number().positive().max(10000),
  irrigationMethod: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationLabel: z.string().trim().min(2).max(280),
});

const imageInput = z.object({
  farmId: z.number().int().positive(),
  crop: z.string().trim().min(2).max(120),
  dataUrl: z.string().max(7_000_000),
});

function decodeImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new Error("Please use a JPEG, PNG, or WEBP crop photo.");
  const [, mimeType, content] = match;
  const bytes = Buffer.from(content, "base64");
  if (bytes.length === 0 || bytes.length > 5_000_000) throw new Error("Use a clear crop photo smaller than 5 MB.");
  return { mimeType, bytes };
}

export function decodeAudioDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(audio\/(?:webm|wav|mpeg|ogg|mp4))(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) throw new Error("Use a WEBM, WAV, MP3, OGG, or M4A voice recording.");
  const [, mimeType, content] = match;
  const bytes = Buffer.from(content, "base64");
  if (bytes.length === 0 || bytes.length > 16_000_000) throw new Error("Use a voice recording smaller than 16 MB.");
  return { mimeType, bytes };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  farm: router({
    list: protectedProcedure.query(({ ctx }) => listFarmsForOwner(ctx.user.id)),
    create: protectedProcedure.input(farmInput).mutation(({ ctx, input }) => createFarmForOwner(ctx.user.id, input)),
    update: protectedProcedure.input(farmInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => {
      const { id, ...values } = input;
      return updateFarmForOwner(ctx.user.id, id, values);
    }),
  }),
  diagnosis: router({
    list: protectedProcedure.query(({ ctx }) => listDiagnosesForOwner(ctx.user.id)),
    upload: protectedProcedure.input(imageInput).mutation(async ({ ctx, input }) => {
      const farm = await getFarmForOwner(ctx.user.id, input.farmId);
      if (!farm) throw new Error("Choose one of your farms before uploading a crop photo.");
      const { bytes, mimeType } = decodeImageDataUrl(input.dataUrl);
      const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const stored = await storagePut(`farmers/${ctx.user.id}/diagnoses/${input.farmId}/${Date.now()}.${extension}`, bytes, mimeType);
      return createDiagnosisForOwner(ctx.user.id, { farmId: input.farmId, crop: input.crop, imageKey: stored.key, imageUrl: stored.url });
    }),
    analyze: protectedProcedure.input(z.object({ diagnosisId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const diagnosis = await getDiagnosisForOwner(ctx.user.id, input.diagnosisId);
      if (!diagnosis) throw new Error("This crop photo could not be found.");
      await updateDiagnosisForOwner(ctx.user.id, diagnosis.id, { status: "analysing" });
      try {
        const imageUrl = await storageGetSignedUrl(diagnosis.imageKey);
        const parsed = await assessCropPhoto(imageUrl, diagnosis.crop);
        return updateDiagnosisForOwner(ctx.user.id, diagnosis.id, {
          status: parsed.status === "retake" ? "review" : parsed.status,
          confidence: parsed.confidence,
          resultTitle: parsed.title,
          summary: parsed.summary,
          evidence: JSON.stringify(parsed.evidence),
          actions: JSON.stringify(parsed.actions),
        });
      } catch (error) {
        return updateDiagnosisForOwner(ctx.user.id, diagnosis.id, {
          status: "review",
          confidence: "low",
          resultTitle: "Photo saved — review needs a stable connection",
          summary: "The image is securely saved, but the live crop review could not be reached. Check the field in daylight and retry this review when your connection is stable.",
          evidence: JSON.stringify(["Photo successfully stored in your farm record", "No reliable image assessment was returned yet"]),
          actions: JSON.stringify(["Retry the photo review when online", "Inspect nearby plants for similar changes", "Ask a qualified local agronomist if the issue spreads"]),
        });
      }
    }),
  }),
  assistant: router({
    ask: protectedProcedure.input(z.object({
      message: z.string().trim().min(2).max(1200),
      farm: z.object({ name: z.string(), crop: z.string(), locationLabel: z.string() }).nullable().optional(),
      activeScreen: z.enum(["home", "diagnose", "market", "intelligence", "farms", "settings"]).optional(),
      screenSummary: z.string().trim().max(900).optional(),
    })).mutation(async ({ input }) => askCropCompanion(input.message, {
      farmName: input.farm?.name,
      crop: input.farm?.crop,
      locationLabel: input.farm?.locationLabel,
      activeScreen: input.activeScreen,
      screenSummary: input.screenSummary,
    })),
    assessPhoto: protectedProcedure.input(z.object({ crop: z.string().trim().min(2).max(120), dataUrl: z.string().max(7_000_000) })).mutation(async ({ input }) => {
      decodeImageDataUrl(input.dataUrl);
      const result = await assessCropPhoto(input.dataUrl, input.crop);
      return {
        status: result.status === "retake" ? "review" : result.status,
        resultTitle: result.title,
        confidence: result.confidence,
        summary: result.summary,
        evidence: JSON.stringify(result.evidence),
        actions: JSON.stringify(result.actions),
      };
    }),
    transcribe: protectedProcedure.input(z.object({ dataUrl: z.string().max(22_000_000), language: z.enum(["en", "hi", "mr", "hinglish"]).optional() })).mutation(async ({ ctx, input }) => {
      const { mimeType, bytes } = decodeAudioDataUrl(input.dataUrl);
      const extension = mimeType === "audio/wav" ? "wav" : mimeType === "audio/ogg" ? "ogg" : mimeType === "audio/mpeg" ? "mp3" : mimeType === "audio/mp4" ? "m4a" : "webm";
      const stored = await storagePut(`farmers/${ctx.user.id}/voice/${Date.now()}.${extension}`, bytes, mimeType);
      const audioUrl = await storageGetSignedUrl(stored.key);
      const transcriptLanguage = input.language === "hinglish" ? "hi" : input.language;
      const result = await transcribeAudio({ audioUrl, language: transcriptLanguage, prompt: input.language === "hinglish" ? "Transcribe code-mixed Hinglish (Hindi and English) questions about Indian farming, crops, mandi, irrigation, soil, and advisory. Keep crop names and numbers exactly as spoken." : "Transcribe Indian farming, crops, mandi, irrigation, soil, and advisory questions. Keep crop names and numbers exactly as spoken." });
      if ("error" in result) throw new Error(result.error);
      return { text: result.text, language: result.language };
    }),
  }),
  market: router({
    latest: protectedProcedure.input(z.object({ commodityId: z.number().int().positive(), stateId: z.number().int().nonnegative().optional(), districtId: z.number().int().nonnegative().optional() })).query(({ input }) => getCedaLatestPrice(input)),
    forecast: protectedProcedure.input(z.object({ commodityId: z.number().int().positive(), stateId: z.number().int().nonnegative().optional(), districtId: z.number().int().nonnegative().optional() })).query(({ input }) => getCedaPriceForecast(input)),
  }),
  linkage: router({
    list: protectedProcedure.query(({ ctx }) => listHarvestIntentsForOwner(ctx.user.id)),
    create: protectedProcedure.input(z.object({
      farmId: z.number().int().positive(),
      expectedHarvestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      expectedQuantityQuintals: z.number().positive().max(100000),
      notes: z.string().trim().max(500).optional(),
    })).mutation(({ ctx, input }) => createHarvestIntentForOwner(ctx.user.id, { ...input, status: "planning" })),
  }),
});

export type AppRouter = typeof appRouter;
