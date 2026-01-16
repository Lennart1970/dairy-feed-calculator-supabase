import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import CalculatorForm from "@/components/CalculatorForm";
import ResultsDashboard from "@/components/ResultsDashboard";
import ConcentrateFeedSection from "@/components/ConcentrateFeedSection";
import MprInput, { type MprData } from "@/components/MprInput";
import MprValidation from "@/components/MprValidation";
import ExpertReport from "@/components/ExpertReport";
import RoughageSummaryTable, { type RoughageFeed } from "@/components/RoughageSummaryTable";
import DierprofielCard from "@/components/DierprofielCard";
import BehoefteCard from "@/components/BehoefteCard";
import { LabReportUpload, type ParsedFeedData } from "@/components/LabReportUpload";
import SectionNav from "@/components/SectionNav";
import { type CalculationResult, type FeedData, type FeedInput } from "@/lib/calculator";
import { AuditableCalculationDisplay } from "@/components/AuditableCalculationDisplay";
import { runAuditableCalculation, type AuditableCalculationResult } from "@/lib/auditableBridge";

// Concentrate feed inputs state type
type FeedInputState = Record<string, FeedInput>;

// Default concentrate feed amounts (keys must match database feed names exactly - lowercase!)
const DEFAULT_CONCENTRATE_INPUTS: FeedInputState = {
  'bierborstel': { amountKg: 0.5, dsPercent: 23 },
  'gerstmeel': { amountKg: 0.7, dsPercent: 87 },
  'raapzaadschroot': { amountKg: 2.6, dsPercent: 87 },
  'stalbrok': { amountKg: 3.6, dsPercent: 89 },
  'startbrok': { amountKg: 1.4, dsPercent: 89 },
};
import { Milk, FileSpreadsheet, Download, ArrowRight, ArrowLeft, CheckCircle2, Wheat, FlaskConical, Settings2, Upload, Plus, X, Scale, Zap, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExpertReportData {
  feeds: FeedData[];
  feedInputs: { feedId: string; amountKg: number; dsPercent: number }[];
  animalProfile: {
    name: string;
    weight: number;
    vemRequirement: number;
    dveRequirement: number;
  };
}

interface ConcentrateFeedData {
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
}

// Roughage feed entry data
interface RoughageEntry {
  id: string;
  name: string;
  displayName: string;
  vem: number;
  dve: number;
  oeb: number;
  dsPercent: number;
  amount: number;
}

// Default roughage feeds are now loaded from database
// This is a fallback in case database is not available
const FALLBACK_ROUGHAGE_FEEDS: RoughageEntry[] = [
  { id: "kuil_1_gras", name: "kuil_1_gras", displayName: "Kuil 1 gras", vem: 951, dve: 76, oeb: 28, dsPercent: 41, amount: 5.3 },
  { id: "kuil_2_gras", name: "kuil_2_gras", displayName: "Kuil 2 gras", vem: 864, dve: 63, oeb: 5, dsPercent: 40, amount: 2.7 },
  { id: "mais_2025", name: "mais_2025", displayName: "Maïs 2025", vem: 987, dve: 52, oeb: -42, dsPercent: 35, amount: 8.0 },
];

// Page indicator component
function PageIndicator({ currentPage, onPageChange }: { currentPage: 1 | 2 | 3 | 4 | 5; onPageChange: (page: 1 | 2 | 3 | 4 | 5) => void }) {
  const pages = [
    { num: 1 as const, label: "Behoefte", icon: Milk, color: "blue" },
    { num: 2 as const, label: "Aanbod", icon: Wheat, color: "orange" },
    { num: 4 as const, label: "Expert Rapport", icon: FileSpreadsheet, color: "purple" },
    { num: 5 as const, label: "MPR Validatie", icon: FlaskConical, color: "indigo" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {pages.map((page, idx) => (
        <div key={page.num} className="flex items-center">
          <button
            onClick={() => onPageChange(page.num)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentPage === page.num 
                ? page.color === "emerald" ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                  page.color === "pink" ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' :
                  page.color === "blue" ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' :
                  page.color === "orange" ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' :
                  page.color === "indigo" ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' :
                  'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : currentPage > page.num
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {currentPage > page.num && <CheckCircle2 className="w-4 h-4" />}
            <span className="font-medium">{page.num}. {page.label}</span>
          </button>
          {idx < pages.length - 1 && (
            <div className="w-6 h-0.5 bg-slate-300 dark:bg-slate-700 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// Roughage input row component
function RoughageInputRow({ 
  feed, 
  onAmountChange, 
  onDsPercentChange,
  onRemove
}: { 
  feed: RoughageEntry; 
  onAmountChange: (id: string, value: number) => void;
  onDsPercentChange: (id: string, value: number) => void;
  onRemove?: (id: string) => void;
}) {
  const [kgProductInput, setKgProductInput] = useState<string>('');
  const [isEditingKgProduct, setIsEditingKgProduct] = useState(false);

  // Calculate kg Product from kg DS when not editing
  const calculatedKgProduct = feed.dsPercent > 0 ? ((feed.amount / feed.dsPercent) * 100).toFixed(1) : '';

  return (
    <div className="grid grid-cols-12 gap-3 items-center py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className={onRemove ? "col-span-3" : "col-span-4"}>
        <div className="font-medium text-sm">{feed.displayName}</div>
        <div className="text-xs text-muted-foreground font-mono">
          {feed.dsPercent}% DS | {feed.vem} VEM | {feed.dve}g DVE | {feed.oeb >= 0 ? '+' : ''}{feed.oeb}g OEB
        </div>
      </div>
      <div className="col-span-3">
        <Label className="text-xs text-muted-foreground">Hoeveelheid (kg DS)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={feed.amount || ""}
          onChange={(e) => onAmountChange(feed.id, parseFloat(e.target.value) || 0)}
          className="h-9 text-center font-mono"
        />
      </div>
      <div className="col-span-2">
        <Label className="text-xs text-muted-foreground">kg Product</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={isEditingKgProduct ? kgProductInput : calculatedKgProduct}
          onFocus={() => {
            setIsEditingKgProduct(true);
            setKgProductInput(calculatedKgProduct);
          }}
          onChange={(e) => {
            setKgProductInput(e.target.value);
          }}
          onBlur={() => {
            const kgProduct = parseFloat(kgProductInput) || 0;
            // Calculate kg DS from kg Product: kg DS = (kg Product × DS%) / 100
            const kgDS = (kgProduct * feed.dsPercent) / 100;
            onAmountChange(feed.id, kgDS);
            setIsEditingKgProduct(false);
          }}
          className="h-9 text-center font-mono"
        />
      </div>
      <div className={onRemove ? "col-span-3" : "col-span-3"} >
        <div className="text-xs text-muted-foreground text-right">Bijdrage</div>
        <div className="text-sm font-mono text-right">
          <span className="text-amber-600">{Math.round(feed.amount * feed.vem).toLocaleString()} VEM</span>
        </div>
      </div>
      {onRemove && (
        <div className="col-span-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(feed.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // Page mode: 'calculator' shows all 3 sections on one page, 4 and 5 are separate pages
  const [currentPage, setCurrentPage] = useState<'calculator' | 4 | 5>('calculator');
  const [activeSection, setActiveSection] = useState<string>('behoefte');
  
  // Section refs for scroll navigation
  const behoefteRef = useRef<HTMLDivElement | null>(null);
  const aanbodRef = useRef<HTMLDivElement | null>(null);
  
  // Scroll to section handler
  const handleSectionClick = useCallback((sectionId: string) => {
    setCurrentPage('calculator');
    setActiveSection(sectionId);
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      behoefte: behoefteRef,
      aanbod: aanbodRef,
    };
    const ref = refs[sectionId];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  
  // Handle page change for Expert Rapport and MPR Validatie
  const handlePageChange = useCallback((page: 4 | 5) => {
    setCurrentPage(page);
  }, []);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>('Holstein-Fries - Hoogproductief (41kg melk)');
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [dynamicRequirements, setDynamicRequirements] = useState<{ vemTotal: number; dveTotal: number } | null>(null);
  const [mprData, setMprData] = useState<MprData | null>(null);
  const [expertReportData, setExpertReportData] = useState<ExpertReportData | null>(null);
  const [isExpertReportOpen, setIsExpertReportOpen] = useState(false);
  const [concentrateFeedData, setConcentrateFeedData] = useState<ConcentrateFeedData | null>(null);
  
  // Expert report tab state
  const [expertReportTab, setExpertReportTab] = useState<'report' | 'audit'>('report');
  
  // Auditable calculation result
  const [auditableResult, setAuditableResult] = useState<AuditableCalculationResult | null>(null);
  
  // Concentrate feed inputs state (lifted from CalculatorForm for immediate availability)
  const [concentrateFeedInputs, setConcentrateFeedInputs] = useState<FeedInputState>(DEFAULT_CONCENTRATE_INPUTS);
  
  // Handler for concentrate feed amount changes
  const handleConcentrateFeedAmountChange = useCallback((feedName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setConcentrateFeedInputs(prev => ({
      ...prev,
      [feedName]: { ...prev[feedName], amountKg: numValue }
    }));
  }, []);
  
  // Handler for concentrate feed DS% changes
  const handleConcentrateFeedDsPercentChange = useCallback((feedName: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setConcentrateFeedInputs(prev => ({
      ...prev,
      [feedName]: { ...prev[feedName], dsPercent: numValue }
    }));
  }, []);
  
  // Fetch feeds data from database
  const { data: feedsData } = trpc.feeds.list.useQuery();
  
  // Fetch default rations for the selected profile
  const { data: defaultRationsData } = trpc.profileRations.getForProfile.useQuery(
    { profileId: selectedProfile?.id || 1 },
    { enabled: !!selectedProfile?.id }
  );
  
  // Derive concentrate feeds from database (filter by category or name pattern)
  const concentrateFeeds = useMemo(() => {
    if (!feedsData) return [];
    return feedsData
      .filter(feed => feed.category !== 'roughage' && !feed.name.includes('gras') && !feed.name.includes('mais'))
      .map(f => ({
        name: f.name,
        displayName: f.displayName,
        vemPerUnit: f.vemPerUnit,
        dvePerUnit: f.dvePerUnit,
        oebPerUnit: f.oebPerUnit,
        basis: f.basis,
        defaultDsPercent: f.defaultDsPercent,
      }));
  }, [feedsData]);
  
  // Derive roughage feeds from database
  const databaseRoughageFeeds = useMemo(() => {
    if (!feedsData) return null;
    const roughageFromDb = feedsData
      .filter(feed => feed.category === 'roughage' || feed.name.includes('gras') || feed.name.includes('mais'))
      .map(f => {
        // Find default amount from profile rations if available
        const defaultRation = defaultRationsData?.find(r => r.feedId === f.id);
        return {
          id: f.name,
          name: f.name,
          displayName: f.displayName,
          vem: f.vemPerUnit,
          dve: f.dvePerUnit,
          oeb: f.oebPerUnit,
          dsPercent: f.defaultDsPercent,
          amount: defaultRation?.defaultAmount || 0,
          swPerKgDs: f.swPerKgDs,
          vwPerKgDs: f.vwPerKgDs,
          pricePerTon: f.pricePerTon,
        };
      });
    return roughageFromDb.length > 0 ? roughageFromDb : null;
  }, [feedsData, defaultRationsData]);
  
  // Roughage state - initialize with database feeds when available
  const [roughageFeeds, setRoughageFeeds] = useState<RoughageEntry[]>(FALLBACK_ROUGHAGE_FEEDS);
  const [hasInitializedFromDb, setHasInitializedFromDb] = useState(false);
  
  // Update roughage feeds when database data becomes available
  useEffect(() => {
    if (databaseRoughageFeeds && !hasInitializedFromDb) {
      setRoughageFeeds(databaseRoughageFeeds);
      setHasInitializedFromDb(true);
    }
  }, [databaseRoughageFeeds, hasInitializedFromDb]);
  const [isGrazing, setIsGrazing] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [nextFeedId, setNextFeedId] = useState(4); // Start after default feeds

  // Handle parsed lab report data
  const handleLabReportParsed = useCallback((data: ParsedFeedData) => {
    // Create a new roughage feed from the parsed data
    const newFeed: RoughageEntry = {
      id: `uploaded_${nextFeedId}`,
      name: `uploaded_${nextFeedId}`,
      displayName: `${data.productName} (${data.productType})`,
      vem: data.vem,
      dve: data.dve,
      oeb: data.oeb,
      dsPercent: data.dsPercent,
      amount: 0, // User will set the amount
    };
    
    setRoughageFeeds(prev => [...prev, newFeed]);
    setNextFeedId(prev => prev + 1);
    setShowUploadForm(false);
  }, [nextFeedId]);

  // Handle removing a roughage feed
  const handleRemoveRoughageFeed = useCallback((id: string) => {
    setRoughageFeeds(prev => prev.filter(f => f.id !== id));
  }, []);

  // Handle roughage amount change
  const handleRoughageAmountChange = useCallback((id: string, value: number) => {
    setRoughageFeeds(prev => prev.map(f => f.id === id ? { ...f, amount: value } : f));
  }, []);

  // Handle roughage DS% change
  const handleRoughageDsPercentChange = useCallback((id: string, value: number) => {
    setRoughageFeeds(prev => prev.map(f => f.id === id ? { ...f, dsPercent: value } : f));
  }, []);

  // Convert roughage feeds to summary table format
  const roughageSummaryData: RoughageFeed[] = useMemo(() => {
    return roughageFeeds.map(f => ({
      id: f.id,
      name: f.displayName,
      amount: f.amount,
      dsPercent: f.dsPercent,
      vem: f.vem,
      dve: f.dve,
      oeb: f.oeb,
    }));
  }, [roughageFeeds]);

  // Calculate roughage totals
  const roughageTotals = useMemo(() => {
    return roughageFeeds.reduce(
      (acc, feed) => ({
        dryMatter: acc.dryMatter + feed.amount,
        vem: acc.vem + (feed.amount * feed.vem),
        dve: acc.dve + (feed.amount * feed.dve),
        oeb: acc.oeb + (feed.amount * feed.oeb),
      }),
      { dryMatter: 0, vem: 0, dve: 0, oeb: 0 }
    );
  }, [roughageFeeds]);

  const handleCalculationChange = useCallback((result: CalculationResult | null) => {
    setCalculationResult(result);
  }, []);

  const handleProfileChange = useCallback((profileName: string | null) => {
    setSelectedProfileName(profileName);
  }, []);

  const handleMprChange = useCallback((data: MprData) => {
    setMprData(data);
  }, []);

  const handleExpertReportData = useCallback((data: ExpertReportData) => {
    setExpertReportData(data);
  }, []);

  const handleConcentrateFeedDataReady = useCallback((data: ConcentrateFeedData) => {
    setConcentrateFeedData(data);
  }, []);

  // Run auditable calculation when inputs change
  useEffect(() => {
    if (!selectedProfileName || !concentrateFeeds.length) return;
    
    try {
      const result = runAuditableCalculation(
        roughageFeeds,
        concentrateFeeds,
        concentrateFeedInputs,
        {
          name: selectedProfileName,
          weightKg: 700, // Default weight, will be overridden by profile
        },
        'Volwassen (2+ lactaties)', // Default parity
        '>100 dagen (midden/late lactatie)', // Default DIM
        'Niet drachtig', // Default pregnancy
        mprData,
        isGrazing
      );
      setAuditableResult(result);
    } catch (error) {
      console.error('Auditable calculation error:', error);
    }
  }, [roughageFeeds, concentrateFeeds, concentrateFeedInputs, selectedProfileName, mprData, isGrazing]);

  // Check if selected profile is a lactating cow (show MPR for milk-producing animals)
  const isLactatingCow = selectedProfileName && (
    selectedProfileName.includes("Melkkoe") || 
    selectedProfileName.includes("melk") ||
    selectedProfileName.includes("lactatie") ||
    selectedProfileName.includes("Hoogproductieve")
  );

  // Check if user can proceed to next pages
  const hasRoughageData = roughageFeeds.some(f => f.amount > 0);
  const canProceedToPage2 = hasRoughageData;
  const canProceedToPage3 = selectedProfileName !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Milk className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Melkveevoer Calculator
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gebaseerd op CVB 2025 Voedernormen Herkauwers
                </p>
              </div>
            </div>
            

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Section Navigation */}
        <SectionNav 
          activeSection={activeSection} 
          onSectionClick={handleSectionClick} 
          onPageChange={handlePageChange}
          currentPage={currentPage}
        />

        {/* Roughage Summary Table - Show only on page 5 (MPR Validatie) */}
        {currentPage === 5 && hasRoughageData && (
          <div className="mb-6">
            <RoughageSummaryTable 
              feeds={roughageSummaryData} 
              isGrazing={isGrazing}
              onEdit={() => { setCurrentPage('calculator'); handleSectionClick('ruwvoer'); }}
            />
          </div>
        )}

        {/* SINGLE PAGE CALCULATOR: All 3 sections on one page */}
        {currentPage === 'calculator' && (
          <div className="grid lg:grid-cols-[1fr,400px] gap-6">
            {/* Left Column: Scrollable sections */}
            <div className="space-y-8">
                      {/* SECTION 1: Behoefte (MPR + Profiel) */}
              <div ref={behoefteRef} id="behoefte" className="scroll-mt-24">
                <BehoefteCard
                  mprData={mprData}
                  onMprChange={handleMprChange}
                  onProfileChange={handleProfileChange}
                  initialProfileName={selectedProfileName}
                />
              </div>

              {/* SECTION 2: Aanbod (Ruwvoer + Krachtvoer + Voedingsbalans) */}
              <div ref={aanbodRef} id="aanbod" className="scroll-mt-24">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <Wheat className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">2. Aanbod</h2>
                    <p className="text-sm text-muted-foreground">
                      Ruwvoer en krachtvoer samenstelling
                    </p>
                  </div>
                </div>

                {/* Two-column layout: Feeds on left, Voedingsbalans on right */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left Column: Ruwvoer + Krachtvoer stacked */}
                  <div className="space-y-6">
                    {/* Ruwvoer Card */}
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50/30 dark:from-emerald-950/40 dark:to-green-950/20 border-l-4 border-l-emerald-500">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <div>
                            <span className="text-emerald-700 dark:text-emerald-400">Ruwvoer</span>
                            <span className="text-muted-foreground font-normal text-sm ml-2">— Laboratoriumuitslagen</span>
                          </div>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                          Voer hier de kuilanalyse-uitslagen in van uw ruwvoer
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Lab Report Upload Section */}
                        {showUploadForm ? (
                          <LabReportUpload 
                            onParsed={handleLabReportParsed}
                            onClose={() => setShowUploadForm(false)}
                          />
                        ) : (
                          <div className="flex gap-2 mb-4">
                            <Button 
                              variant="outline" 
                              onClick={() => setShowUploadForm(true)}
                              className="flex-1 border-dashed border-2 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Lab Rapport Uploaden (PDF)
                            </Button>
                          </div>
                        )}

                        {/* Roughage input rows */}
                        {roughageFeeds.map((feed) => (
                          <RoughageInputRow
                            key={feed.id}
                            feed={feed}
                            onAmountChange={handleRoughageAmountChange}
                            onDsPercentChange={handleRoughageDsPercentChange}
                            onRemove={handleRemoveRoughageFeed}
                          />
                        ))}

                        {/* Grazing toggle */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Wheat className="w-4 h-4 text-green-600" />
                            <Label htmlFor="grazing" className="text-sm font-medium">
                              Beweiding (+1.175 VEM bonus)
                            </Label>
                          </div>
                          <Switch
                            id="grazing"
                            checked={isGrazing}
                            onCheckedChange={setIsGrazing}
                          />
                        </div>

                        {/* Totals summary */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 mt-4">
                          <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                            Totaal Ruwvoer
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                {roughageTotals.dryMatter.toFixed(1)}
                              </div>
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Scale className="w-3 h-3" />
                                <span>kg DS</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-amber-600">
                                {(Math.round(roughageTotals.vem) + (isGrazing ? 1175 : 0)).toLocaleString()}
                              </div>
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Zap className="w-3 h-3 text-amber-600" />
                                <span>VEM</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-blue-600">
                                {Math.round(roughageTotals.dve)}
                              </div>
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Beef className="w-3 h-3 text-blue-600" />
                                <span>g DVE</span>
                              </div>
                            </div>
                            <div>
                              <div className={`text-2xl font-bold ${roughageTotals.oeb >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {roughageTotals.oeb >= 0 ? '+' : ''}{Math.round(roughageTotals.oeb)}
                              </div>
                              <div className="text-xs text-muted-foreground">g OEB</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Krachtvoer Card - directly below Ruwvoer */}
                    {concentrateFeeds.length > 0 && (
                      <ConcentrateFeedSection
                        concentrateFeeds={concentrateFeeds}
                        feedInputs={concentrateFeedInputs}
                        onFeedAmountChange={handleConcentrateFeedAmountChange}
                        onDsPercentChange={handleConcentrateFeedDsPercentChange}
                      />
                    )}
                  </div>

                  {/* Right Column: Voedingsbalans Dashboard - sticky */}
                  <div className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto scrollbar-thin">
                    <ResultsDashboard result={calculationResult} mprData={mprData} />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Empty (moved to side-by-side layout) */}
            <div className="hidden lg:block"></div>
          </div>
        )}

        {/* PAGE 4: Expert Rapport */}
        {currentPage === 4 && (
          <div className="space-y-6">
            {/* Back button and Tab Navigation */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => { setCurrentPage('calculator'); handleSectionClick('optimalisatie'); }}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Terug naar Calculator
              </Button>
              
              {/* Tab buttons */}
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setExpertReportTab('report')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    expertReportTab === 'report'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  📊 Expert Rapport
                </button>
                <button
                  onClick={() => setExpertReportTab('audit')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    expertReportTab === 'audit'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🔍 Audit Trail
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {expertReportTab === 'report' ? (
              // Expert Report Content
              expertReportData && calculationResult ? (
                <ExpertReport
                  result={calculationResult}
                  feeds={expertReportData.feeds}
                  feedInputs={expertReportData.feedInputs}
                  mprData={mprData}
                  animalProfile={expertReportData.animalProfile}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Vul eerst de voedergegevens in op de vorige pagina's om het expert rapport te genereren.
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              // Audit Trail Content
              auditableResult ? (
                <AuditableCalculationDisplay result={auditableResult} />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Vul eerst de voedergegevens in om de audit trail te genereren.
                    </p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}

        {/* PAGE 5: MPR Validatie */}
        {currentPage === 5 && (
          <div className="space-y-6">
            {/* Back button */}
            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(4)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Terug naar Expert Rapport
              </Button>
            </div>

            {/* MPR Validatie Content - MPR data already entered on Step 2 */}
            {isLactatingCow && mprData ? (
              <MprValidation 
                mprData={mprData}
                totalSupply={calculationResult ? {
                  vem: calculationResult.totalSupply.vem,
                  dveGrams: calculationResult.totalSupply.dveGrams,
                } : undefined}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FlaskConical className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    MPR Validatie is alleen beschikbaar voor melkgevende koeien.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Hidden CalculatorForm to keep callbacks alive - Always mounted */}
        <div className="hidden">
          <CalculatorForm 
            onCalculationChange={handleCalculationChange}
            onProfileChange={handleProfileChange}
            onExpertReportData={handleExpertReportData}
            mprData={mprData}
            onConcentrateFeedDataReady={handleConcentrateFeedDataReady}
            hideStep4={true}
            hideStep1={true}
            hideStep2={true}
            roughageFeeds={roughageFeeds}
            isGrazing={isGrazing}
            concentrateFeedInputs={concentrateFeedInputs}
            onConcentrateFeedInputsChange={setConcentrateFeedInputs}
            externalProfileName={selectedProfileName}
          />
        </div>

        {/* Footer Info */}
        <footer className="mt-16 pt-8 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="text-center text-sm text-muted-foreground space-y-3">
            <p>
              Voedingswaarden gebaseerd op <span className="font-medium">Tabellenboek Voeding Herkauwers 2025</span> (CVB)
            </p>
            <p className="text-xs">
              VEM = Voedereenheid Melk • DVE = Darm Verteerbaar Eiwit • OEB = Onbestendig Eiwit Balans
            </p>
            <div className="flex items-center justify-center gap-6">
              <a 
                href="/bronnen" 
                className="inline-flex items-center gap-2 text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
                Bronnen & Referenties
              </a>
              <span className="text-slate-300">|</span>
              <a 
                href="/beheer" 
                className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Voermiddelen Beheer
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
