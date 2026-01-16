import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getAllAnimalProfiles, getAnimalProfileById, getAllFeeds, getFeedByName } from "./db";
import { uploadPdfForProcessing, parseLabReportPdf } from "./pdfParser";
import { z } from "zod";

export const appRouter = router({
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

  // Animal Profiles Router
  animalProfiles: router({
    list: publicProcedure.query(async () => {
      const profiles = await getAllAnimalProfiles();
      return profiles.map(p => ({
        ...p,
        maxBdsKg: typeof p.max_bds_kg === 'number' ? p.max_bds_kg : parseFloat(String(p.max_bds_kg)) || 0,
      }));
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const profile = await getAnimalProfileById(input.id);
        if (!profile) return null;
        return {
          ...profile,
          maxBdsKg: parseFloat(String(profile.maxBdsKg)),
        };
      }),
  }),

  // Feeds Router
  feeds: router({
    list: publicProcedure.query(async () => {
      const feedList = await getAllFeeds();
      return feedList.map(f => ({
        ...f,
        caPerUnit: typeof f.ca_per_unit === 'number' ? f.ca_per_unit : parseFloat(String(f.ca_per_unit)) || 0,
        pPerUnit: typeof f.p_per_unit === 'number' ? f.p_per_unit : parseFloat(String(f.p_per_unit)) || 0,
      }));
    }),
    getByName: publicProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        const feed = await getFeedByName(input.name);
        if (!feed) return null;
        return {
          ...feed,
          caPerUnit: parseFloat(String(feed.caPerUnit)),
          pPerUnit: parseFloat(String(feed.pPerUnit)),
        };
      }),
  }),

  // Lab Report Parser Router
  labReport: router({
    parse: publicProcedure
      .input(z.object({
        pdfBase64: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Strip data URL prefix if present (e.g., "data:application/pdf;base64,")
          let base64Data = input.pdfBase64;
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          
          // Convert base64 to buffer
          const pdfBuffer = Buffer.from(base64Data, "base64");
          
          // Upload PDF to storage to get a URL
          const pdfUrl = await uploadPdfForProcessing(pdfBuffer, input.fileName);
          
          // Parse the PDF using LLM
          const result = await parseLabReportPdf(pdfUrl);
          
          return result;
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Fout bij het verwerken van het rapport"
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
