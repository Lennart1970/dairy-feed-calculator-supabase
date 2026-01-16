import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { calculateRation, calculateTotalSupply, calculateFcm, type CalculationResult, type FeedData, type FeedInput, type AnimalProfileData } from "@/lib/calculator";
import { calculateDynamicRequirements, type DynamicRequirementInputs } from "@/lib/dynamicRequirements";
import { Wheat, Leaf, Package, Layers, Target, ClipboardCheck, TrendingUp, AlertTriangle, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import GapAnalysisVisualization from "./GapAnalysisVisualization";

interface CalculatorFormProps {
  onCalculationChange: (result: CalculationResult | null) => void;
  onProfileChange?: (profileName: string | null) => void;
  onExpertReportData?: (data: {
    feeds: FeedData[];
    feedInputs: { feedId: string; amountKg: number; dsPercent: number }[];
    animalProfile: {
      name: string;
      weight: number;
      vemRequirement: number;
      dveRequirement: number;
    };
  }) => void;
  mprData?: {
    milkProduction: number;
    fatPercent: number;
    proteinPercent: number;
    ureum: number;
  } | null;
  onConcentrateFeedDataReady?: (data: {
    concentrateFeeds: Array<{
      name: string;
      displayName: string;
      vemPerUnit: number;
      dvePerUnit: number;
      oebPerUnit: number;
      basis: string;
      defaultDsPercent: number;
    }>;
    feedInputs: Record<string, { amountKg: number; dsPercent: number }>;
    onFeedAmountChange: (feedName: string, value: string) => void;
    onDsPercentChange: (feedName: string, value: string) => void;
  }) => void;
  hideStep4?: boolean;
  hideStep1?: boolean;
  hideStep2?: boolean;
  roughageFeeds?: Array<{
    id: string;
    name: string;
    displayName: string;
    vem: number;
    dve: number;
    oeb: number;
    dsPercent: number;
    amount: number;
  }>;
  isGrazing?: boolean;
  // Lifted concentrate feed inputs from parent
  concentrateFeedInputs?: Record<string, { amountKg: number; dsPercent: number }>;
  onConcentrateFeedInputsChange?: (inputs: Record<string, { amountKg: number; dsPercent: number }>) => void;
  // External profile name from parent (for syncing profile selection)
  externalProfileName?: string | null;
}

// Dynamic feed input state - keyed by feed name
type FeedInputState = Record<string, FeedInput>;

// Helper function to convert database feed to FeedData with proper types
function toFeedData(feed: { 
  name: string; 
  displayName: string; 
  vemPerUnit: number; 
  dvePerUnit: number; 
  oebPerUnit: number; 
  caPerUnit: number; 
  pPerUnit: number; 
  defaultDsPercent: number; 
  basis: string;
  swPerKgDs: string | number;
  vwPerKgDs?: string | number | null;
}): FeedData {
  return {
    ...feed,
    swPerKgDs: typeof feed.swPerKgDs === 'string' ? parseFloat(feed.swPerKgDs) : feed.swPerKgDs,
    vwPerKgDs: feed.vwPerKgDs ? (typeof feed.vwPerKgDs === 'string' ? parseFloat(feed.vwPerKgDs) : feed.vwPerKgDs) : undefined,
  };
}

// Standard rations for each profile - auto-populate when profile is selected
const standardRations: Record<string, Record<string, number>> = {
  "Vaars 12 maanden": {
    "kuil_1_gras": 5.3,
    "kuil_2_gras": 2.7,
  },
  "Melkkoe (30kg melk)": {
    "kuil_1_gras": 5.3,
    "kuil_2_gras": 2.7,
    "mais_2025": 8.0,
    "bierborstel": 0.5,
    "gerstmeel": 0.7,
    "raapzaadschroot": 2.6,
    "stalbrok": 3.6,
    "startbrok": 1.4,
  },
  "Droge koe 9e maand": {
    "kuil_1_gras": 6.0,
    "kuil_2_gras": 3.0,
    "mais_2025": 4.0,
  },
  "Vaars 1e lactatie (30kg melk)": {
    "kuil_1_gras": 6.0,
    "kuil_2_gras": 3.0,
    "mais_2025": 6.0,
    "raapzaadschroot": 2.0,
    "stalbrok": 4.0,
    "startbrok": 2.0,
  },
  "Hoogproductieve koe (41kg melk)": {
    "kuil_1_gras": 5.3,
    "kuil_2_gras": 2.7,
    "mais_2025": 8.0,
    "bierborstel": 0.5,
    "gerstmeel": 0.7,
    "raapzaadschroot": 2.6,
    "stalbrok": 3.6,
    "startbrok": 1.4,
  },
};

// Step indicator component
function StepIndicator({ step, title, subtitle, isActive, isComplete }: { 
  step: number; 
  title: string; 
  subtitle: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
      isActive ? 'bg-primary/10 border border-primary/20' : 
      isComplete ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/30'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        isActive ? 'bg-primary text-primary-foreground' :
        isComplete ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : step}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : ''}`}>{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  );
}

// Gap indicator for a single nutrient
function GapIndicator({ label, supply, requirement, unit, isOeb = false }: {
  label: string;
  supply: number;
  requirement: number;
  unit: string;
  isOeb?: boolean;
}) {
  const gap = supply - requirement;
  const percentage = requirement > 0 ? (supply / requirement) * 100 : (isOeb ? (supply >= 0 ? 100 : 0) : 0);
  
  let status: 'ok' | 'warning' | 'deficit';
  if (isOeb) {
    status = supply >= 0 ? 'ok' : supply >= -50 ? 'warning' : 'deficit';
  } else {
    status = percentage >= 100 ? 'ok' : percentage >= 90 ? 'warning' : 'deficit';
  }
  
  const statusConfig = {
    ok: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    deficit: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={`p-3 rounded-lg ${config.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg font-bold ${config.color}`}>
          {isOeb ? (gap >= 0 ? '+' : '') : ''}{Math.round(supply).toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          / {Math.round(requirement).toLocaleString()} {unit}
        </span>
      </div>
      {!isOeb && (
        <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              status === 'ok' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function CalculatorForm({ onCalculationChange, onProfileChange, onExpertReportData, mprData, onConcentrateFeedDataReady, hideStep4, hideStep1, hideStep2, roughageFeeds: externalRoughageFeeds, isGrazing: externalIsGrazing, concentrateFeedInputs: externalConcentrateFeedInputs, onConcentrateFeedInputsChange, externalProfileName }: CalculatorFormProps) {
  // Calculate FCM-based VEM requirement when MPR data is available
  const calculateFcmVemRequirement = (mpr: { milkProduction: number; fatPercent: number; proteinPercent: number }) => {
    const fcm = (0.337 + 0.116 * mpr.fatPercent + 0.06 * mpr.proteinPercent) * mpr.milkProduction;
    return 442 * fcm + 5000; // 5000 = maintenance VEM
  };
  
  const calculateFcmDveRequirement = (mpr: { milkProduction: number; proteinPercent: number }) => {
    const dveForMilk = 1.396 * (mpr.milkProduction * mpr.proteinPercent * 10);
    return dveForMilk + 350; // 350 = maintenance DVE
  };
  const { data: animalProfiles, isLoading: profilesLoading } = trpc.animalProfiles.list.useQuery();
  const { data: feedsData, isLoading: feedsLoading } = trpc.feeds.list.useQuery();
  
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [isGrazingInternal, setIsGrazingInternal] = useState(false);
  // Use external concentrate feed inputs if provided (lifted state pattern)
  const [internalFeedInputs, setInternalFeedInputs] = useState<FeedInputState>({});
  
  // Merge external concentrate inputs with internal roughage inputs
  const feedInputs = useMemo(() => {
    if (externalConcentrateFeedInputs) {
      return { ...internalFeedInputs, ...externalConcentrateFeedInputs };
    }
    return internalFeedInputs;
  }, [internalFeedInputs, externalConcentrateFeedInputs]);
  
  // Wrapper to update feed inputs - routes concentrate feeds to parent, roughage to internal
  const setFeedInputs = useCallback((updater: FeedInputState | ((prev: FeedInputState) => FeedInputState)) => {
    if (typeof updater === 'function') {
      // For function updates, we need to handle both internal and external
      setInternalFeedInputs(prev => {
        const newState = updater({ ...prev, ...externalConcentrateFeedInputs });
        // Separate concentrate and roughage inputs
        const concentrateKeys = ['bierborstel', 'gerstmeel', 'raapzaadschroot', 'stalbrok', 'startbrok'];
        const concentrateInputs: FeedInputState = {};
        const roughageInputs: FeedInputState = {};
        for (const [key, value] of Object.entries(newState)) {
          if (concentrateKeys.includes(key)) {
            concentrateInputs[key] = value;
          } else {
            roughageInputs[key] = value;
          }
        }
        // Notify parent about concentrate changes
        if (onConcentrateFeedInputsChange && Object.keys(concentrateInputs).length > 0) {
          onConcentrateFeedInputsChange(concentrateInputs);
        }
        return roughageInputs;
      });
    } else {
      setInternalFeedInputs(updater);
    }
  }, [externalConcentrateFeedInputs, onConcentrateFeedInputsChange]);
  
  // VOC-related state (HF lactating cows only)
  const [parity, setParity] = useState<number>(3); // Default: Volwassen (mature cow)
  const [daysInMilk, setDaysInMilk] = useState<number>(150); // Default: >100 dagen (late lactation)
  const [daysPregnant, setDaysPregnant] = useState<number>(0); // Default: not pregnant
  const [weightKg, setWeightKg] = useState<number>(675); // Default: Holstein-Fries mature cow (CVB 2025)
  
  // Use external isGrazing if provided, otherwise use internal state
  const isGrazing = externalIsGrazing !== undefined ? externalIsGrazing : isGrazingInternal;
  const setIsGrazing = setIsGrazingInternal;

  // Get selected profile
  const selectedProfile = useMemo(() => {
    if (!animalProfiles) return null;
    // Use external profile name if provided (from parent component)
    if (externalProfileName) {
      return animalProfiles.find(p => p.name === externalProfileName) ?? null;
    }
    // Otherwise use internal selectedProfileId
    if (selectedProfileId === null) return null;
    return animalProfiles.find(p => p.id === selectedProfileId) ?? null;
  }, [animalProfiles, selectedProfileId, externalProfileName]);
  
  // Calculate dynamic requirements based on parity/DIM/pregnancy
  // For Holstein-Fries profile, use defaults if no MPR data
  const dynamicRequirements = useMemo(() => {
    if (!selectedProfile) return null;
    
    // Check if this is the HF profile (dynamic requirements only for HF)
    const isHolsteinFries = selectedProfile.name.includes('Holstein-Fries');
    if (!isHolsteinFries) return null;
    
    // Use MPR data if available, otherwise use profile defaults
    let fpcm: number;
    if (mprData && mprData.milkProduction > 0) {
      fpcm = calculateFcm(mprData);
    } else {
      // Extract milk production from profile name (e.g., "41kg melk" -> 41)
      const milkMatch = selectedProfile.name.match(/(\d+)kg\s*melk/i);
      const defaultMilk = milkMatch ? parseInt(milkMatch[1]) : 41;
      // Use standard HF fat/protein percentages
      const defaultFat = 4.60;
      const defaultProtein = 3.75;
      // Calculate FPCM with defaults
      fpcm = defaultMilk * (0.337 + 0.116 * defaultFat + 0.06 * defaultProtein);
    }
    
    const inputs: DynamicRequirementInputs = {
      weightKg, // Use user-editable weight instead of profile default
      parity,
      daysInMilk,
      daysPregnant,
      fpcm,
      isGrazing,
    };
    
    return calculateDynamicRequirements(inputs);
  }, [selectedProfile, mprData, parity, daysInMilk, daysPregnant, isGrazing, weightKg]);

  // Track if initial feed inputs have been set
  const hasInitializedFeedInputs = useRef(false);

  // Initialize feed inputs and set default profile when data loads
  useEffect(() => {
    if (feedsData && animalProfiles && animalProfiles.length > 0 && !hasInitializedFeedInputs.current) {
      hasInitializedFeedInputs.current = true;
      // Default to Holstein-Fries - Hoogproductief (41kg melk) if available, otherwise first profile
      const defaultProfile = animalProfiles.find(p => p.name === "Holstein-Fries - Hoogproductief (41kg melk)") || animalProfiles[0];
      setSelectedProfileId(defaultProfile.id);
      setWeightKg(defaultProfile.weightKg); // Auto-fill weight from default profile
      
      const standardRation = standardRations[defaultProfile.name];
      const initialInputs: FeedInputState = {};
      for (const feed of feedsData) {
        // Check if external roughage feeds are provided and this is a roughage feed
        const externalFeed = externalRoughageFeeds?.find(ef => ef.name === feed.name);
        if (externalFeed) {
          initialInputs[feed.name] = {
            amountKg: externalFeed.amount,
            dsPercent: externalFeed.dsPercent,
          };
        } else {
          const standardAmount = standardRation?.[feed.name] || 0;
          initialInputs[feed.name] = {
            amountKg: standardAmount,
            dsPercent: feed.defaultDsPercent,
          };
        }
      }
      setFeedInputs(initialInputs);
    }
  }, [feedsData, animalProfiles, externalRoughageFeeds]);

  // Sync external roughage feed changes to feedInputs (for real-time SW updates)
  // Use a ref to track previous external roughage feeds to avoid unnecessary updates
  const prevExternalRoughageFeedsRef = useRef<typeof externalRoughageFeeds>(null);
  
  useEffect(() => {
    if (!externalRoughageFeeds || !feedsData || !hasInitializedFeedInputs.current) return;
    
    // Only update if external roughage feeds have actually changed
    const prevFeeds = prevExternalRoughageFeedsRef.current;
    const feedsChanged = !prevFeeds || 
      prevFeeds.length !== externalRoughageFeeds.length ||
      externalRoughageFeeds.some((feed, i) => 
        !prevFeeds[i] || 
        feed.amount !== prevFeeds[i].amount || 
        feed.dsPercent !== prevFeeds[i].dsPercent
      );
    
    if (!feedsChanged) return;
    
    prevExternalRoughageFeedsRef.current = externalRoughageFeeds;
    
    // Update internal feed inputs directly for roughage feeds
    // Use setInternalFeedInputs directly to avoid wrapper complexity
    setInternalFeedInputs(prev => {
      const updated = { ...prev };
      for (const externalFeed of externalRoughageFeeds) {
        // Always update roughage feeds from external source
        updated[externalFeed.name] = {
          amountKg: externalFeed.amount,
          dsPercent: externalFeed.dsPercent,
        };
      }
      return updated;
    });
  }, [externalRoughageFeeds, feedsData]);

  // Handle profile change
  const handleProfileChange = (profileId: number) => {
    setSelectedProfileId(profileId);
    
    const profile = animalProfiles?.find(p => p.id === profileId);
    if (profile && feedsData) {
      // Auto-fill weight based on profile
      setWeightKg(profile.weightKg);
      
      const standardRation = standardRations[profile.name];
      if (standardRation) {
        const newInputs: FeedInputState = {};
        for (const feed of feedsData) {
          const standardAmount = standardRation[feed.name] || 0;
          newInputs[feed.name] = {
            amountKg: standardAmount,
            dsPercent: feed.defaultDsPercent,
          };
        }
        setFeedInputs(newInputs);
      }
    }
  };

  // Notify parent when profile changes (only after user interaction, not on initial render)
  const hasUserSelectedProfile = useRef(false);
  useEffect(() => {
    if (selectedProfile && hasUserSelectedProfile.current) {
      onProfileChange?.(selectedProfile.name);
    }
  }, [selectedProfile, onProfileChange]);

  // Separate feeds by category
  const { roughageFeeds, concentrateFeeds } = useMemo(() => {
    if (!feedsData) return { roughageFeeds: [], concentrateFeeds: [] };
    
    const roughage: typeof feedsData = [];
    const concentrate: typeof feedsData = [];
    
    for (const feed of feedsData) {
      if (feed.name.includes("gras") || feed.name.includes("mais")) {
        roughage.push(feed);
      } else {
        concentrate.push(feed);
      }
    }
    
    return { roughageFeeds: roughage, concentrateFeeds: concentrate };
  }, [feedsData]);

  // Calculate roughage-only supply for gap analysis
  const roughageSupply = useMemo(() => {
    if (!roughageFeeds.length || !feedsData) return null;
    
    const roughageFeedInputs: { feed: FeedData; input: FeedInput }[] = [];
    for (const feed of roughageFeeds) {
      const input = feedInputs[feed.name];
      if (input && input.amountKg > 0) {
        roughageFeedInputs.push({ feed: toFeedData(feed), input });
      }
    }
    
    if (roughageFeedInputs.length === 0) return null;
    return calculateTotalSupply(roughageFeedInputs, isGrazing);
  }, [roughageFeeds, feedInputs, isGrazing, feedsData]);

  // Calculate total supply for gap visualization
  const totalSupply = useMemo(() => {
    if (!feedsData || Object.keys(feedInputs).length === 0) return null;
    
    const allFeedInputs: { feed: FeedData; input: FeedInput }[] = [];
    for (const feed of feedsData) {
      const input = feedInputs[feed.name];
      if (input && input.amountKg > 0) {
        allFeedInputs.push({ feed: toFeedData(feed), input });
      }
    }
    
    if (allFeedInputs.length === 0) return null;
    return calculateTotalSupply(allFeedInputs, isGrazing);
  }, [feedsData, feedInputs, isGrazing]);

  // Calculate full ration
  useEffect(() => {
    if (!selectedProfile || !feedsData || Object.keys(feedInputs).length === 0) {
      onCalculationChange(null);
      return;
    }

    const feeds: { feed: FeedData; input: FeedInput }[] = [];
    for (const feed of feedsData) {
      const input = feedInputs[feed.name];
      if (input && input.amountKg > 0) {
        feeds.push({ feed: toFeedData(feed), input });
      }
    }

    if (feeds.length === 0) {
      onCalculationChange(null);
      return;
    }

    const result = calculateRation(
      selectedProfile as AnimalProfileData, 
      feeds, 
      isGrazing, 
      mprData,
      { parity, daysInMilk, daysPregnant }
    );
    onCalculationChange(result);

    // Send expert report data
    if (onExpertReportData && feedsData) {
      const feedInputsForReport = Object.entries(feedInputs)
        .filter(([_, input]) => input.amountKg > 0)
        .map(([feedId, input]) => ({
          feedId,
          amountKg: input.amountKg,
          dsPercent: input.dsPercent,
        }));

      onExpertReportData({
        feeds: feedsData.map(toFeedData),
        feedInputs: feedInputsForReport,
        animalProfile: {
          name: selectedProfile.name,
          weight: selectedProfile.weightKg,
          vemRequirement: dynamicRequirements ? dynamicRequirements.vemTotal : selectedProfile.vemTarget,
          dveRequirement: dynamicRequirements ? dynamicRequirements.dveTotal : selectedProfile.dveTargetGrams,
        },
      });
    }
  }, [selectedProfile, feedsData, feedInputs, isGrazing, onCalculationChange, onExpertReportData, mprData, dynamicRequirements, parity, daysInMilk, daysPregnant]);

  const handleFeedAmountChange = useCallback((feedName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFeedInputs(prev => ({
      ...prev,
      [feedName]: { ...prev[feedName], amountKg: numValue },
    }));
  }, []);

  const handleDsPercentChange = useCallback((feedName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFeedInputs(prev => ({
      ...prev,
      [feedName]: { ...prev[feedName], dsPercent: Math.min(100, Math.max(0, numValue)) },
    }));
  }, []);

  // Notify parent about concentrate feed data for external rendering
  useEffect(() => {
    if (onConcentrateFeedDataReady && concentrateFeeds.length > 0) {
      onConcentrateFeedDataReady({
        concentrateFeeds: concentrateFeeds.map(f => ({
          name: f.name,
          displayName: f.displayName,
          vemPerUnit: f.vemPerUnit,
          dvePerUnit: f.dvePerUnit,
          oebPerUnit: f.oebPerUnit,
          basis: f.basis,
          defaultDsPercent: f.defaultDsPercent,
        })),
        feedInputs,
        onFeedAmountChange: handleFeedAmountChange,
        onDsPercentChange: handleDsPercentChange,
      });
    }
  }, [onConcentrateFeedDataReady, concentrateFeeds, feedInputs, handleFeedAmountChange, handleDsPercentChange]);

  // Determine step completion status
  const hasRoughage = roughageFeeds.some(f => (feedInputs[f.name]?.amountKg || 0) > 0);
  const hasProfile = selectedProfile !== null;
  const hasConcentrate = concentrateFeeds.some(f => (feedInputs[f.name]?.amountKg || 0) > 0);

  if (profilesLoading || feedsLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Feed input component
  const FeedInputRow = ({ feed }: { feed: NonNullable<typeof feedsData>[0] }) => {
    const input = feedInputs[feed.name] || { amountKg: 0, dsPercent: feed.defaultDsPercent };
    const unitLabel = feed.basis === "per kg DS" ? "kg DS" : "kg product";
    
    return (
      <div className="space-y-2 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <Label className="font-medium text-sm">{feed.displayName}</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {input.dsPercent}% DS | {feed.vemPerUnit} VEM | {feed.dvePerUnit}g DVE | {feed.oebPerUnit > 0 ? "+" : ""}{feed.oebPerUnit}g OEB
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`${feed.name}-amount`} className="text-xs text-muted-foreground">
              Hoeveelheid ({unitLabel})
            </Label>
            <Input
              id={`${feed.name}-amount`}
              type="number"
              min="0"
              step="0.1"
              value={input.amountKg || ""}
              onChange={(e) => handleFeedAmountChange(feed.name, e.target.value)}
              placeholder="0"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${feed.name}-ds`} className="text-xs text-muted-foreground">
              DS% (Droge Stof)
            </Label>
            <Input
              id={`${feed.name}-ds`}
              type="number"
              min="0"
              max="100"
              step="1"
              value={input.dsPercent || ""}
              onChange={(e) => handleDsPercentChange(feed.name, e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      </div>
    );
  };

  // Step 4 component - can be rendered separately
  const Step4Content = (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50/30 dark:from-orange-950/40 dark:to-red-950/20 border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            4
          </div>
          <div>
            <span className="text-orange-700 dark:text-orange-400">Krachtvoer</span>
            <span className="text-muted-foreground font-normal text-sm ml-2">— Het Vulmateriaal</span>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Kies krachtvoer om het rantsoen in balans te brengen. Eerst correctiekrachtvoer, dan productiebrok.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Correctiekrachtvoer */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="font-medium text-sm">Correctiekrachtvoer</span>
            <span className="text-xs text-muted-foreground">(voor OEB/DVE tekorten)</span>
          </div>
          <div className="space-y-2">
            {concentrateFeeds
              .filter(f => ['bierborstel', 'raapzaadschroot', 'gerstmeel'].includes(f.name))
              .map((feed) => (
                <FeedInputRow key={feed.name} feed={feed} />
              ))}
          </div>
        </div>
        
        {/* Productiebrok */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="font-medium text-sm">Productiebrok</span>
            <span className="text-xs text-muted-foreground">(voor melkproductie)</span>
          </div>
          <div className="space-y-2">
            {concentrateFeeds
              .filter(f => ['stalbrok', 'startbrok'].includes(f.name))
              .map((feed) => (
                <FeedInputRow key={feed.name} feed={feed} />
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* STEP 1: Ruwvoeranalyse - De Fundering */}
      {!hideStep1 && (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/40 dark:to-green-950/20 border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <div>
                <span className="text-emerald-700 dark:text-emerald-400">Ruwvoeranalyse</span>
                <span className="text-muted-foreground font-normal text-sm ml-2">— De Fundering</span>
              </div>
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300">
              Start hier
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Het ruwvoer bepaalt hoeveel "basismelk" de koe uit haar hoofdvoer kan produceren. Voer hier uw kuilanalyse-uitslagen in.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {roughageFeeds.map((feed) => (
            <FeedInputRow key={feed.name} feed={feed} />
          ))}
          
          {/* Grazing Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <div className="space-y-0.5">
              <Label htmlFor="grazing-toggle" className="text-sm font-medium flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-500" />
                Beweiding
              </Label>
              <p className="text-xs text-muted-foreground">
                +1.175 VEM toeslag voor weidegang
              </p>
            </div>
            <Switch
              id="grazing-toggle"
              checked={isGrazing}
              onCheckedChange={setIsGrazing}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
          
          {/* Roughage Summary */}
          {roughageSupply && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                  Basismelk uit Ruwvoer
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {Math.round(roughageSupply.vem).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">VEM</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {Math.round(roughageSupply.dveGrams)}g
                  </p>
                  <p className="text-xs text-muted-foreground">DVE</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    {roughageSupply.oebGrams >= 0 ? '+' : ''}{Math.round(roughageSupply.oebGrams)}g
                  </p>
                  <p className="text-xs text-muted-foreground">OEB</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* STEP 2: Dierprofiel - De Bouwtekening */}
      {!hideStep2 && (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-sky-50/50 dark:from-blue-950/40 dark:to-sky-950/20 border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-400">Dierprofiel</span>
              <span className="text-muted-foreground font-normal text-sm ml-2">— De Bouwtekening</span>
            </div>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Selecteer het diertype om de theoretische behoefte te bepalen.
          </p>
          
          {/* Dynamic Requirements Explanation - HF Only */}
          {selectedProfile?.name.includes('Holstein-Fries') && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <p className="font-medium mb-1">🧮 Dynamische berekening (alleen Holstein-Fries):</p>
              <ul className="space-y-0.5 ml-4 list-disc">
                <li><strong>Gewicht</strong>: Onderhoudsbehoefte = 52.2 × LG^0.75 (metabolisch gewicht)</li>
                <li><strong>Lactatie</strong>: Vaars (1e lactatie) +625 VEM groeitoeslag</li>
                <li><strong>Dagen in Melk</strong>: Groeitoeslag alleen bij ≤100 dagen</li>
                <li><strong>Dracht</strong>: Drachttoeslag vanaf 190 dagen drachtig</li>
              </ul>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-select" className="text-sm font-medium">
              Selecteer Diertype
            </Label>
            <Select
              value={selectedProfileId?.toString() ?? ""}
              onValueChange={(value) => handleProfileChange(parseInt(value))}
            >
              <SelectTrigger id="profile-select" className="h-11 bg-white dark:bg-slate-800">
                <SelectValue placeholder="Kies een dierprofiel" />
              </SelectTrigger>
              <SelectContent>
                {animalProfiles?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id.toString()}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* VOC Input Fields - HF Lactating Only */}
          {selectedProfile && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="parity-select" className="text-sm font-medium">
                  Lactatie
                </Label>
                <Select
                  value={parity === 1 ? "vaars" : "volwassen"}
                  onValueChange={(value) => setParity(value === "vaars" ? 1 : 3)}
                >
                  <SelectTrigger id="parity-select" className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vaars">Vaars (1e lactatie)</SelectItem>
                    <SelectItem value="volwassen">Volwassen (2+ lactaties)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dim-select" className="text-sm font-medium">
                  Dagen in Melk
                </Label>
                <Select
                  value={daysInMilk <= 100 ? "early" : "late"}
                  onValueChange={(value) => setDaysInMilk(value === "early" ? 50 : 150)}
                >
                  <SelectTrigger id="dim-select" className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early">≤100 dagen (vroege lactatie)</SelectItem>
                    <SelectItem value="late">&gt;100 dagen (midden/late lactatie)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pregnant-select" className="text-sm font-medium">
                  Dracht
                </Label>
                <Select
                  value={daysPregnant < 190 ? "not_pregnant" : "pregnant"}
                  onValueChange={(value) => setDaysPregnant(value === "not_pregnant" ? 0 : 220)}
                >
                  <SelectTrigger id="pregnant-select" className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_pregnant">Niet drachtig</SelectItem>
                    <SelectItem value="pregnant">Drachtig (≥190d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight-input" className="text-sm font-medium">
                  Gewicht (kg)
                </Label>
                <Input
                  id="weight-input"
                  type="number"
                  min="300"
                  max="900"
                  value={weightKg}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 675 : Number(e.target.value);
                    if (!isNaN(value) && value >= 300 && value <= 900) {
                      setWeightKg(value);
                    }
                  }}
                  className="h-11 bg-white dark:bg-slate-800"
                />
                <p className="text-xs text-muted-foreground">Levend gewicht (LG)</p>
              </div>
            </div>
          )}
          
          {selectedProfile && (
            <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-sm text-blue-700 dark:text-blue-400">
                  Behoefte (Bouwtekening)
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{selectedProfile.description}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-white/50 dark:bg-slate-800/50">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {dynamicRequirements ? dynamicRequirements.vemTotal.toLocaleString() : selectedProfile.vemTarget.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">VEM</p>
                </div>
                <div className="p-2 rounded bg-white/50 dark:bg-slate-800/50">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {dynamicRequirements ? `${dynamicRequirements.dveTotal}g` : `${selectedProfile.dveTargetGrams}g`}
                  </p>
                  <p className="text-xs text-muted-foreground">DVE</p>
                </div>
                <div className="p-2 rounded bg-white/50 dark:bg-slate-800/50">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{selectedProfile.maxBdsKg}</p>
                  <p className="text-xs text-muted-foreground">kg DS max</p>
                </div>
              </div>
              {selectedProfile.notes && (
                <p className="text-xs text-muted-foreground italic mt-3">{selectedProfile.notes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* STEP 3: Gap-Analyse - Tekorten Opsporen */}
      {selectedProfile && roughageSupply && totalSupply && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-950/40 dark:to-yellow-950/20 border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
                <div>
                  <span className="text-amber-700 dark:text-amber-400">Ruwvoertekort</span>
                  <span className="text-muted-foreground font-normal text-sm ml-2">— Basis voor Krachtvoerkeuze</span>
                </div>
              </CardTitle>
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300">
                <BarChart3 className="w-3 h-3 mr-1" />
                Visualisatie
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Visuele vergelijking van ruwvoeraanbod met dierbehoefte. Groene balken tonen dekking, rode balken tonen tekorten.
            </p>
          </CardHeader>
          <CardContent>
            <GapAnalysisVisualization
              roughageSupply={{
                vem: roughageSupply.vem,
                dveGrams: roughageSupply.dveGrams,
                oebGrams: roughageSupply.oebGrams,
              }}
              requirements={{
                // Use dynamic requirements if available, otherwise fall back to profile defaults
                vem: dynamicRequirements 
                  ? dynamicRequirements.vemTotal
                  : (mprData && mprData.milkProduction > 0 
                      ? calculateFcmVemRequirement(mprData) + (isGrazing ? 1175 : 0)
                      : selectedProfile.vemTarget + (isGrazing ? 1175 : 0)),
                dve: dynamicRequirements
                  ? dynamicRequirements.dveTotal
                  : (mprData && mprData.milkProduction > 0
                      ? calculateFcmDveRequirement(mprData)
                      : selectedProfile.dveTargetGrams),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Krachtvoerkeuze - Het Vulmateriaal */}
      {!hideStep4 && Step4Content}
    </div>
  );
}
