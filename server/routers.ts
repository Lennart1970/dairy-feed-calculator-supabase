import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getAllAnimalProfiles, getAnimalProfileById, getAllFeeds, getFeedByName, getDefaultRationsForProfile, getActiveFeeds, getFeedsByCategory, updateFeedPrice } from "./db";
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
      // Map snake_case database fields to camelCase for frontend
      return profiles.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        notes: p.notes,
        weightKg: p.weight_kg,
        vemTarget: p.vem_target,
        dveTargetGrams: p.dve_target_grams,
        maxBdsKg: typeof p.max_bds_kg === 'number' ? p.max_bds_kg : parseFloat(String(p.max_bds_kg)) || 0,
        parity: p.parity,
        daysInMilk: p.days_in_milk,
        daysPregnant: p.days_pregnant,
        createdAt: p.created_at,
      }));
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const profile = await getAnimalProfileById(input.id);
        if (!profile) return null;
        // Map snake_case database fields to camelCase for frontend
        return {
          id: profile.id,
          name: profile.name,
          description: profile.description,
          notes: profile.notes,
          weightKg: profile.weight_kg,
          vemTarget: profile.vem_target,
          dveTargetGrams: profile.dve_target_grams,
          maxBdsKg: typeof profile.max_bds_kg === 'number' ? profile.max_bds_kg : parseFloat(String(profile.max_bds_kg)) || 0,
          parity: profile.parity,
          daysInMilk: profile.days_in_milk,
          daysPregnant: profile.days_pregnant,
          createdAt: profile.created_at,
        };
      }),
  }),

  // Feeds Router
  feeds: router({
    list: publicProcedure.query(async () => {
      const feedList = await getAllFeeds();
      return feedList.map(f => ({
        id: f.id,
        name: f.name,
        displayName: f.display_name,
        basis: f.basis,
        vemPerUnit: f.vem_per_unit,
        dvePerUnit: f.dve_per_unit,
        oebPerUnit: f.oeb_per_unit,
        caPerUnit: typeof f.ca_per_unit === 'number' ? f.ca_per_unit : parseFloat(String(f.ca_per_unit)) || 0,
        pPerUnit: typeof f.p_per_unit === 'number' ? f.p_per_unit : parseFloat(String(f.p_per_unit)) || 0,
        defaultDsPercent: f.default_ds_percent,
        swPerKgDs: typeof f.sw_per_kg_ds === 'number' ? f.sw_per_kg_ds : parseFloat(String(f.sw_per_kg_ds)) || 0,
        vwPerKgDs: typeof f.vw_per_kg_ds === 'number' ? f.vw_per_kg_ds : parseFloat(String(f.vw_per_kg_ds)) || 0,
        category: f.category,
        source: f.source,
        pricePerTon: f.price_per_ton ? parseFloat(String(f.price_per_ton)) : null,
        isActive: f.is_active,
        sortOrder: f.sort_order,
        createdAt: f.created_at,
      }));
    }),
    listActive: publicProcedure.query(async () => {
      const feedList = await getActiveFeeds();
      return feedList.map(f => ({
        id: f.id,
        name: f.name,
        displayName: f.display_name,
        basis: f.basis,
        vemPerUnit: f.vem_per_unit,
        dvePerUnit: f.dve_per_unit,
        oebPerUnit: f.oeb_per_unit,
        caPerUnit: typeof f.ca_per_unit === 'number' ? f.ca_per_unit : parseFloat(String(f.ca_per_unit)) || 0,
        pPerUnit: typeof f.p_per_unit === 'number' ? f.p_per_unit : parseFloat(String(f.p_per_unit)) || 0,
        defaultDsPercent: f.default_ds_percent,
        swPerKgDs: typeof f.sw_per_kg_ds === 'number' ? f.sw_per_kg_ds : parseFloat(String(f.sw_per_kg_ds)) || 0,
        vwPerKgDs: typeof f.vw_per_kg_ds === 'number' ? f.vw_per_kg_ds : parseFloat(String(f.vw_per_kg_ds)) || 0,
        category: f.category,
        source: f.source,
        pricePerTon: f.price_per_ton ? parseFloat(String(f.price_per_ton)) : null,
        isActive: f.is_active,
        sortOrder: f.sort_order,
        createdAt: f.created_at,
      }));
    }),
    listByCategory: publicProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        const feedList = await getFeedsByCategory(input.category);
        return feedList.map(f => ({
          id: f.id,
          name: f.name,
          displayName: f.display_name,
          basis: f.basis,
          vemPerUnit: f.vem_per_unit,
          dvePerUnit: f.dve_per_unit,
          oebPerUnit: f.oeb_per_unit,
          caPerUnit: typeof f.ca_per_unit === 'number' ? f.ca_per_unit : parseFloat(String(f.ca_per_unit)) || 0,
          pPerUnit: typeof f.p_per_unit === 'number' ? f.p_per_unit : parseFloat(String(f.p_per_unit)) || 0,
          defaultDsPercent: f.default_ds_percent,
          swPerKgDs: typeof f.sw_per_kg_ds === 'number' ? f.sw_per_kg_ds : parseFloat(String(f.sw_per_kg_ds)) || 0,
          vwPerKgDs: typeof f.vw_per_kg_ds === 'number' ? f.vw_per_kg_ds : parseFloat(String(f.vw_per_kg_ds)) || 0,
          category: f.category,
          source: f.source,
          pricePerTon: f.price_per_ton ? parseFloat(String(f.price_per_ton)) : null,
          isActive: f.is_active,
          sortOrder: f.sort_order,
          createdAt: f.created_at,
        }));
      }),
    getByName: publicProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        const feed = await getFeedByName(input.name);
        if (!feed) return null;
        return {
          id: feed.id,
          name: feed.name,
          displayName: feed.display_name,
          basis: feed.basis,
          vemPerUnit: feed.vem_per_unit,
          dvePerUnit: feed.dve_per_unit,
          oebPerUnit: feed.oeb_per_unit,
          caPerUnit: typeof feed.ca_per_unit === 'number' ? feed.ca_per_unit : parseFloat(String(feed.ca_per_unit)) || 0,
          pPerUnit: typeof feed.p_per_unit === 'number' ? feed.p_per_unit : parseFloat(String(feed.p_per_unit)) || 0,
          defaultDsPercent: feed.default_ds_percent,
          swPerKgDs: typeof feed.sw_per_kg_ds === 'number' ? feed.sw_per_kg_ds : parseFloat(String(feed.sw_per_kg_ds)) || 0,
          vwPerKgDs: typeof feed.vw_per_kg_ds === 'number' ? feed.vw_per_kg_ds : parseFloat(String(feed.vw_per_kg_ds)) || 0,
          category: feed.category,
          source: feed.source,
          pricePerTon: feed.price_per_ton ? parseFloat(String(feed.price_per_ton)) : null,
          isActive: feed.is_active,
          sortOrder: feed.sort_order,
          createdAt: feed.created_at,
        };
      }),
    updatePrice: publicProcedure
      .input(z.object({ feedId: z.number(), pricePerTon: z.number() }))
      .mutation(async ({ input }) => {
        const success = await updateFeedPrice(input.feedId, input.pricePerTon);
        return { success };
      }),
  }),

  // Profile Default Rations Router
  profileRations: router({
    getForProfile: publicProcedure
      .input(z.object({ profileId: z.number() }))
      .query(async ({ input }) => {
        const rations = await getDefaultRationsForProfile(input.profileId);
        return rations.map(r => ({
          id: r.id,
          profileId: r.profile_id,
          feedId: r.feed_id,
          defaultAmount: parseFloat(String(r.default_amount)),
          createdAt: r.created_at,
        }));
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
