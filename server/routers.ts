import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { 
  getAllAnimalProfiles, getAnimalProfileById, 
  getAllFeeds, getFeedByName, getDefaultRationsForProfile, getActiveFeeds, getFeedsByCategory, updateFeedPrice,
  // Farm Management
  getFarm, updateFarm,
  getHerdGroups, getHerdGroupById, createHerdGroup, updateHerdGroup, deleteHerdGroup,
  getInventory, updateInventoryStock, recordDelivery, updateDailyUsageRate,
  getGroupRation, saveGroupRation, calculateFarmDailyUsage,
  // Base Rations
  getBaseRations, getBaseRationById, createBaseRation, updateBaseRation, deleteBaseRation,
  setBaseRationFeeds, calculateBaseRationDensity,
  // Lab Results
  saveLabResultAsFeed, getLabResultsForFarm, getLabResultById, deleteLabResult,
  // MPR Deliveries
  getMprDeliveries, getMprDeliveriesByDateRange, getMprMonthlySummary,
  // MPR Cow Records (Dieroverzicht)
  getMprSessions, getMprCowRecords, getMprCowHistory, getMprHerdSummary
} from "./db";
import { parseLabReportPdf } from "./pdfParser";
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
          // Parse the PDF using LLM with base64 data directly
          const result = await parseLabReportPdf(input.pdfBase64);
          
          return result;
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Fout bij het verwerken van het rapport"
          };
        }
      }),
    
    // Save parsed lab result as feed
    saveAsFeed: publicProcedure
      .input(z.object({
        farmId: z.number(),
        productName: z.string(),
        productType: z.string().optional(),
        vem: z.number(),
        dve: z.number(),
        oeb: z.number(),
        dsPercent: z.number(),
        sw: z.number(),
        rawProtein: z.number().optional(),
        rawFiber: z.number().optional(),
        sugar: z.number().optional(),
        starch: z.number().optional(),
        reportFileUrl: z.string().optional(),
        reportFileName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await saveLabResultAsFeed({
          farm_id: input.farmId,
          product_name: input.productName,
          product_type: input.productType,
          vem: input.vem,
          dve: input.dve,
          oeb: input.oeb,
          ds_percent: input.dsPercent,
          sw: input.sw,
          raw_protein: input.rawProtein,
          raw_fiber: input.rawFiber,
          sugar: input.sugar,
          starch: input.starch,
          report_file_url: input.reportFileUrl,
          report_file_name: input.reportFileName,
        });
        
        return { 
          success: !!result, 
          feed: result?.feed ? {
            id: result.feed.id,
            name: result.feed.name,
            displayName: result.feed.display_name,
            vem: result.feed.vem_per_unit,
            dve: result.feed.dve_per_unit,
            oeb: result.feed.oeb_per_unit,
            sw: parseFloat(result.feed.sw_per_kg_ds),
            dsPercent: result.feed.default_ds_percent,
            sourceType: 'lab_verified',
          } : null
        };
      }),
    
    // List all lab results for farm
    list: publicProcedure
      .input(z.object({ farmId: z.number() }))
      .query(async ({ input }) => {
        const results = await getLabResultsForFarm(input.farmId);
        return results.map(r => ({
          id: r.id,
          farmId: r.farm_id,
          productName: r.product_name,
          productType: r.product_type,
          vem: r.vem,
          dve: r.dve,
          oeb: r.oeb,
          dsPercent: parseFloat(String(r.ds_percent)),
          sw: parseFloat(String(r.sw)),
          rawProtein: r.raw_protein,
          rawFiber: r.raw_fiber,
          sugar: r.sugar,
          starch: r.starch,
          qualityScore: r.quality_score,
          uploadDate: r.upload_date,
          isActive: r.is_active,
        }));
      }),
    
    // Delete lab result
    delete: publicProcedure
      .input(z.object({ labResultId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteLabResult(input.labResultId);
        return { success };
      }),
  }),

  // ============================================
  // Farm Management Routers
  // ============================================

  // Farm Router
  farm: router({
    get: publicProcedure
      .input(z.object({ farmId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const farm = await getFarm(input?.farmId || 1);
        if (!farm) return null;
        return {
          id: farm.id,
          name: farm.name,
          ownerUserId: farm.owner_user_id,
          herdSize: farm.herd_size,
          milkPricePerKg: parseFloat(String(farm.milk_price_per_kg)),
          youngStockJuniorCount: farm.young_stock_junior_count || 0,
          youngStockSeniorCount: farm.young_stock_senior_count || 0,
          hectaresMaize: farm.hectares_maize ? parseFloat(String(farm.hectares_maize)) : 8.0,
          hectaresGrass: farm.hectares_grass ? parseFloat(String(farm.hectares_grass)) : 32.0,
          yieldMaizeTonDsHa: farm.yield_maize_ton_ds_ha ? parseFloat(String(farm.yield_maize_ton_ds_ha)) : 12.0,
          yieldGrassTonDsHa: farm.yield_grass_ton_ds_ha ? parseFloat(String(farm.yield_grass_ton_ds_ha)) : 11.0,
          qualityLevel: farm.quality_level || 'topkwaliteit',
          createdAt: farm.created_at,
          updatedAt: farm.updated_at,
        };
      }),
    update: publicProcedure
      .input(z.object({
        farmId: z.number(),
        name: z.string().optional(),
        herdSize: z.number().optional(),
        milkPricePerKg: z.number().optional(),
        youngStockJuniorCount: z.number().optional(),
        youngStockSeniorCount: z.number().optional(),
        hectaresMaize: z.number().optional(),
        hectaresGrass: z.number().optional(),
        yieldMaizeTonDsHa: z.number().optional(),
        yieldGrassTonDsHa: z.number().optional(),
        qualityLevel: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const updates: Record<string, unknown> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.herdSize !== undefined) updates.herd_size = input.herdSize;
        if (input.milkPricePerKg !== undefined) updates.milk_price_per_kg = input.milkPricePerKg;
        if (input.youngStockJuniorCount !== undefined) updates.young_stock_junior_count = input.youngStockJuniorCount;
        if (input.youngStockSeniorCount !== undefined) updates.young_stock_senior_count = input.youngStockSeniorCount;
        if (input.hectaresMaize !== undefined) updates.hectares_maize = input.hectaresMaize;
        if (input.hectaresGrass !== undefined) updates.hectares_grass = input.hectaresGrass;
        if (input.yieldMaizeTonDsHa !== undefined) updates.yield_maize_ton_ds_ha = input.yieldMaizeTonDsHa;
        if (input.yieldGrassTonDsHa !== undefined) updates.yield_grass_ton_ds_ha = input.yieldGrassTonDsHa;
        if (input.qualityLevel !== undefined) updates.quality_level = input.qualityLevel;
        const success = await updateFarm(input.farmId, updates as any);
        return { success };
      }),
  }),

  // Herd Groups Router
  herdGroups: router({
    list: publicProcedure
      .input(z.object({ farmId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const groups = await getHerdGroups(input?.farmId || 1);
        return groups.map(g => ({
          id: g.id,
          farmId: g.farm_id,
          name: g.name,
          cowCount: g.cow_count,
          lifeStage: g.life_stage,
          avgParity: parseFloat(String(g.avg_parity)),
          avgWeightKg: parseFloat(String(g.avg_weight_kg)),
          avgDaysInMilk: g.avg_days_in_milk,
          avgDaysPregnant: g.avg_days_pregnant,
          grazingType: g.grazing_type,
          avgMilkYieldKg: parseFloat(String(g.avg_milk_yield_kg)),
          avgFatPercent: parseFloat(String(g.avg_fat_percent)),
          avgProteinPercent: parseFloat(String(g.avg_protein_percent)),
          fpcmDaily: g.fpcm_daily ? parseFloat(String(g.fpcm_daily)) : null,
          vemTarget: g.vem_target,
          dveTarget: g.dve_target,
          vocLimit: g.voc_limit ? parseFloat(String(g.voc_limit)) : null,
          isActive: g.is_active,
          sortOrder: g.sort_order,
        }));
      }),
    getById: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const g = await getHerdGroupById(input.groupId);
        if (!g) return null;
        return {
          id: g.id,
          farmId: g.farm_id,
          name: g.name,
          cowCount: g.cow_count,
          lifeStage: g.life_stage,
          avgParity: parseFloat(String(g.avg_parity)),
          avgWeightKg: parseFloat(String(g.avg_weight_kg)),
          avgDaysInMilk: g.avg_days_in_milk,
          avgDaysPregnant: g.avg_days_pregnant,
          grazingType: g.grazing_type,
          avgMilkYieldKg: parseFloat(String(g.avg_milk_yield_kg)),
          avgFatPercent: parseFloat(String(g.avg_fat_percent)),
          avgProteinPercent: parseFloat(String(g.avg_protein_percent)),
          fpcmDaily: g.fpcm_daily ? parseFloat(String(g.fpcm_daily)) : null,
          vemTarget: g.vem_target,
          dveTarget: g.dve_target,
          vocLimit: g.voc_limit ? parseFloat(String(g.voc_limit)) : null,
          isActive: g.is_active,
          sortOrder: g.sort_order,
        };
      }),
    create: publicProcedure
      .input(z.object({
        farmId: z.number().optional(),
        name: z.string(),
        cowCount: z.number(),
        lifeStage: z.string().optional(),
        avgParity: z.number().optional(),
        avgWeightKg: z.number().optional(),
        avgDaysInMilk: z.number().optional(),
        avgDaysPregnant: z.number().optional(),
        grazingType: z.string().optional(),
        avgMilkYieldKg: z.number().optional(),
        avgFatPercent: z.number().optional(),
        avgProteinPercent: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const group = await createHerdGroup({
          farm_id: input.farmId || 1,
          name: input.name,
          cow_count: input.cowCount,
          life_stage: input.lifeStage || 'lactating',
          avg_parity: String(input.avgParity || 2.5),
          avg_weight_kg: String(input.avgWeightKg || 675),
          avg_days_in_milk: input.avgDaysInMilk || 150,
          avg_days_pregnant: input.avgDaysPregnant || 0,
          grazing_type: input.grazingType || 'none',
          avg_milk_yield_kg: String(input.avgMilkYieldKg || 30),
          avg_fat_percent: String(input.avgFatPercent || 4.4),
          avg_protein_percent: String(input.avgProteinPercent || 3.5),
          fpcm_daily: null,
          vem_target: null,
          dve_target: null,
          voc_limit: null,
          is_active: true,
          sort_order: input.sortOrder || 0,
        });
        return { success: !!group, group };
      }),
    update: publicProcedure
      .input(z.object({
        groupId: z.number(),
        name: z.string().optional(),
        cowCount: z.number().optional(),
        lifeStage: z.string().optional(),
        avgParity: z.number().optional(),
        avgWeightKg: z.number().optional(),
        avgDaysInMilk: z.number().optional(),
        avgDaysPregnant: z.number().optional(),
        grazingType: z.string().optional(),
        avgMilkYieldKg: z.number().optional(),
        avgFatPercent: z.number().optional(),
        avgProteinPercent: z.number().optional(),
        vemTarget: z.number().optional(),
        dveTarget: z.number().optional(),
        vocLimit: z.number().optional(),
        fpcmDaily: z.number().optional(),
        sortOrder: z.number().optional(),
        baseRationId: z.number().optional(),
        concentrateKgPerCow: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const updates: Record<string, unknown> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.cowCount !== undefined) updates.cow_count = input.cowCount;
        if (input.lifeStage !== undefined) updates.life_stage = input.lifeStage;
        if (input.avgParity !== undefined) updates.avg_parity = String(input.avgParity);
        if (input.avgWeightKg !== undefined) updates.avg_weight_kg = String(input.avgWeightKg);
        if (input.avgDaysInMilk !== undefined) updates.avg_days_in_milk = input.avgDaysInMilk;
        if (input.avgDaysPregnant !== undefined) updates.avg_days_pregnant = input.avgDaysPregnant;
        if (input.grazingType !== undefined) updates.grazing_type = input.grazingType;
        if (input.avgMilkYieldKg !== undefined) updates.avg_milk_yield_kg = String(input.avgMilkYieldKg);
        if (input.avgFatPercent !== undefined) updates.avg_fat_percent = String(input.avgFatPercent);
        if (input.avgProteinPercent !== undefined) updates.avg_protein_percent = String(input.avgProteinPercent);
        if (input.vemTarget !== undefined) updates.vem_target = input.vemTarget;
        if (input.dveTarget !== undefined) updates.dve_target = input.dveTarget;
        if (input.vocLimit !== undefined) updates.voc_limit = String(input.vocLimit);
        if (input.fpcmDaily !== undefined) updates.fpcm_daily = String(input.fpcmDaily);
        if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
        if (input.baseRationId !== undefined) updates.base_ration_id = input.baseRationId;
        if (input.concentrateKgPerCow !== undefined) updates.concentrate_kg_per_cow = String(input.concentrateKgPerCow);
        const success = await updateHerdGroup(input.groupId, updates as any);
        return { success };
      }),
    delete: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteHerdGroup(input.groupId);
        return { success };
      }),
  }),

  // Inventory Router
  inventory: router({
    list: publicProcedure
      .input(z.object({ farmId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const items = await getInventory(input?.farmId || 1);
        return items.map(item => ({
          id: item.id,
          farmId: item.farm_id,
          feedId: item.feed_id,
          currentStockKg: parseFloat(String(item.current_stock_kg)),
          siloCapacityKg: item.silo_capacity_kg ? parseFloat(String(item.silo_capacity_kg)) : null,
          minimumStockKg: parseFloat(String(item.minimum_stock_kg)),
          dailyUsageRateKg: parseFloat(String(item.daily_usage_rate_kg)),
          lastDeliveryDate: item.last_delivery_date,
          lastDeliveryKg: item.last_delivery_kg ? parseFloat(String(item.last_delivery_kg)) : null,
          updatedAt: item.updated_at,
          feed: item.feed ? {
            id: item.feed.id,
            name: item.feed.name,
            displayName: item.feed.display_name,
            category: item.feed.category,
            vemPerUnit: item.feed.vem_per_unit,
            dvePerUnit: item.feed.dve_per_unit,
          } : null,
        }));
      }),
    updateStock: publicProcedure
      .input(z.object({
        farmId: z.number().optional(),
        feedId: z.number(),
        currentStockKg: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await updateInventoryStock(
          input.farmId || 1,
          input.feedId,
          input.currentStockKg
        );
        return { success };
      }),
    recordDelivery: publicProcedure
      .input(z.object({
        farmId: z.number().optional(),
        feedId: z.number(),
        deliveryKg: z.number(),
        deliveryDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const success = await recordDelivery(
          input.farmId || 1,
          input.feedId,
          input.deliveryKg,
          input.deliveryDate
        );
        return { success };
      }),
    updateUsageRate: publicProcedure
      .input(z.object({
        farmId: z.number().optional(),
        feedId: z.number(),
        dailyUsageKg: z.number(),
      }))
      .mutation(async ({ input }) => {
        const success = await updateDailyUsageRate(
          input.farmId || 1,
          input.feedId,
          input.dailyUsageKg
        );
        return { success };
      }),
    calculateDailyUsage: publicProcedure
      .input(z.object({ farmId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const usageMap = await calculateFarmDailyUsage(input?.farmId || 1);
        return Array.from(usageMap.entries()).map(([feedId, dailyUsage]) => ({
          feedId,
          dailyUsageKg: dailyUsage,
        }));
      }),
  }),

  // Group Rations Router
  groupRations: router({
    get: publicProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const rations = await getGroupRation(input.groupId);
        return rations.map(r => ({
          id: r.id,
          groupId: r.group_id,
          feedId: r.feed_id,
          amountKgDs: parseFloat(String(r.amount_kg_ds)),
          feedingMethod: r.feeding_method,
          loadOrder: r.load_order,
          feed: r.feed ? {
            id: r.feed.id,
            name: r.feed.name,
            displayName: r.feed.display_name,
            category: r.feed.category,
            vemPerUnit: r.feed.vem_per_unit,
            dvePerUnit: r.feed.dve_per_unit,
            oebPerUnit: r.feed.oeb_per_unit,
            swPerKgDs: parseFloat(String(r.feed.sw_per_kg_ds)),
            vwPerKgDs: r.feed.vw_per_kg_ds ? parseFloat(String(r.feed.vw_per_kg_ds)) : null,
          } : null,
        }));
      }),
    save: publicProcedure
      .input(z.object({
        groupId: z.number(),
        rations: z.array(z.object({
          feedId: z.number(),
          amountKgDs: z.number(),
          feedingMethod: z.string().optional(),
          loadOrder: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const success = await saveGroupRation(
          input.groupId,
          input.rations.map(r => ({
            feed_id: r.feedId,
            amount_kg_ds: r.amountKgDs,
            feeding_method: r.feedingMethod,
            load_order: r.loadOrder,
          }))
        );
        return { success };
      }),
  }),

  // Base Rations Router
  baseRations: router({
    list: publicProcedure
      .input(z.object({ farmId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const rations = await getBaseRations(input?.farmId || 1);
        return rations.map(r => ({
          id: r.id,
          farmId: r.farm_id,
          name: r.name,
          description: r.description,
          targetMilkKg: r.target_milk_kg,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }),

    get: publicProcedure
      .input(z.object({ rationId: z.number() }))
      .query(async ({ input }) => {
        const ration = await getBaseRationById(input.rationId);
        if (!ration) return null;
        
        return {
          id: ration.id,
          farmId: ration.farm_id,
          name: ration.name,
          description: ration.description,
          targetMilkKg: ration.target_milk_kg,
          isActive: ration.is_active,
          createdAt: ration.created_at,
          updatedAt: ration.updated_at,
          feeds: ration.feeds.map(f => ({
            id: f.id,
            baseRationId: f.base_ration_id,
            feedId: f.feed_id,
            percentage: f.percentage,
            amountKgDs: f.amount_kg_ds,
            loadOrder: f.load_order,
            createdAt: f.created_at,
            feed: f.feed ? {
              id: f.feed.id,
              name: f.feed.name,
              displayName: f.feed.display_name,
              category: f.feed.category,
              vemPerUnit: f.feed.vem_per_unit,
              dvePerUnit: f.feed.dve_per_unit,
              oebPerUnit: f.feed.oeb_per_unit,
              swPerKgDs: f.feed.sw_per_kg_ds,
              vwPerKgDs: f.feed.vw_per_kg_ds,
              dsPercent: f.feed.ds_percent,
            } : undefined,
          })),
        };
      }),

    create: publicProcedure
      .input(z.object({
        farmId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        targetMilkKg: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const ration = await createBaseRation({
          farm_id: input.farmId,
          name: input.name,
          description: input.description || null,
          target_milk_kg: input.targetMilkKg || null,
          is_active: input.isActive !== undefined ? input.isActive : true,
        });
        
        if (!ration) return { success: false, rationId: null };
        
        return {
          success: true,
          rationId: ration.id,
          ration: {
            id: ration.id,
            farmId: ration.farm_id,
            name: ration.name,
            description: ration.description,
            targetMilkKg: ration.target_milk_kg,
            isActive: ration.is_active,
            createdAt: ration.created_at,
            updatedAt: ration.updated_at,
          },
        };
      }),

    update: publicProcedure
      .input(z.object({
        rationId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        targetMilkKg: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const updates: any = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.targetMilkKg !== undefined) updates.target_milk_kg = input.targetMilkKg;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        
        const success = await updateBaseRation(input.rationId, updates);
        return { success };
      }),

    delete: publicProcedure
      .input(z.object({ rationId: z.number() }))
      .mutation(async ({ input }) => {
        const success = await deleteBaseRation(input.rationId);
        return { success };
      }),

    setFeeds: publicProcedure
      .input(z.object({
        rationId: z.number(),
        feeds: z.array(z.object({
          feedId: z.number(),
          percentage: z.number().optional(),
          amountKgDs: z.number().optional(),
          loadOrder: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const success = await setBaseRationFeeds(
          input.rationId,
          input.feeds.map(f => ({
            feed_id: f.feedId,
            percentage: f.percentage,
            amount_kg_ds: f.amountKgDs,
            load_order: f.loadOrder,
          }))
        );
        return { success };
      }),

    calculateDensity: publicProcedure
      .input(z.object({ rationId: z.number() }))
      .query(async ({ input }) => {
        const density = await calculateBaseRationDensity(input.rationId);
        if (!density) return null;
        
        return {
          vemPerKgDs: density.vemPerKgDs,
          dvePerKgDs: density.dvePerKgDs,
          oebPerKgDs: density.oebPerKgDs,
          swPerKgDs: density.swPerKgDs,
          vwPerKgDs: density.vwPerKgDs,
        };
      }),
  }),

  // MPR Deliveries Router
  mpr: router({
    list: publicProcedure
      .input(z.object({ farmId: z.number().default(1) }))
      .query(async ({ input }) => {
        const deliveries = await getMprDeliveries(input.farmId);
        return deliveries.map(d => ({
          id: d.id,
          farmId: d.farm_id,
          deliveryDate: d.delivery_date,
          deliveryTime: d.delivery_time,
          kgMelk: parseFloat(d.kg_melk),
          ltrMelk: parseFloat(d.ltr_melk),
          temp: d.temp ? parseFloat(d.temp) : null,
          vetProcent: parseFloat(d.vet_procent),
          eiwitProcent: parseFloat(d.eiwit_procent),
          lactoseProcent: parseFloat(d.lactose_procent),
          ureum: d.ureum,
          ber: d.ber,
          vriesPunt: d.vries_punt ? parseFloat(d.vries_punt) : null,
          zuurgraad: d.zuurgraad ? parseFloat(d.zuurgraad) : null,
          vetEiwitRatio: d.vet_eiwit_ratio ? parseFloat(d.vet_eiwit_ratio) : null,
          antibiotica: d.antibiotica,
          fosfor: d.fosfor,
          myristinezuurC14: d.myristinezuur_c14 ? parseFloat(d.myristinezuur_c14) : null,
          palmitinezuurC16: d.palmitinezuur_c16 ? parseFloat(d.palmitinezuur_c16) : null,
          stearinezuurC18: d.stearinezuur_c18 ? parseFloat(d.stearinezuur_c18) : null,
          oliezuurC181: d.oliezuur_c18_1 ? parseFloat(d.oliezuur_c18_1) : null,
          kgVet: parseFloat(d.kg_vet),
          kgEiwit: parseFloat(d.kg_eiwit),
        }));
      }),

    byDateRange: publicProcedure
      .input(z.object({
        farmId: z.number().default(1),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const deliveries = await getMprDeliveriesByDateRange(input.farmId, input.startDate, input.endDate);
        return deliveries.map(d => ({
          id: d.id,
          farmId: d.farm_id,
          deliveryDate: d.delivery_date,
          deliveryTime: d.delivery_time,
          kgMelk: parseFloat(d.kg_melk),
          ltrMelk: parseFloat(d.ltr_melk),
          temp: d.temp ? parseFloat(d.temp) : null,
          vetProcent: parseFloat(d.vet_procent),
          eiwitProcent: parseFloat(d.eiwit_procent),
          lactoseProcent: parseFloat(d.lactose_procent),
          ureum: d.ureum,
          kgVet: parseFloat(d.kg_vet),
          kgEiwit: parseFloat(d.kg_eiwit),
        }));
      }),

    monthlySummary: publicProcedure
      .input(z.object({ farmId: z.number().default(1) }))
      .query(async ({ input }) => {
        return await getMprMonthlySummary(input.farmId);
      }),
  }),

  // MPR Cow Records (Dieroverzicht) Router
  mprCows: router({
    sessions: publicProcedure
      .input(z.object({ farmId: z.number().default(1) }))
      .query(async ({ input }) => {
        return await getMprSessions(input.farmId);
      }),

    bySession: publicProcedure
      .input(z.object({
        farmId: z.number().default(1),
        mprDate: z.string(),
      }))
      .query(async ({ input }) => {
        return await getMprCowRecords(input.farmId, input.mprDate);
      }),

    cowHistory: publicProcedure
      .input(z.object({
        farmId: z.number().default(1),
        diernr: z.number(),
      }))
      .query(async ({ input }) => {
        return await getMprCowHistory(input.farmId, input.diernr);
      }),

    herdSummary: publicProcedure
      .input(z.object({ farmId: z.number().default(1) }))
      .query(async ({ input }) => {
        return await getMprHerdSummary(input.farmId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
