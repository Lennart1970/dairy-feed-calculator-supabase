import { useState, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { LabReportUpload, type ParsedFeedData } from "@/components/LabReportUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, Wheat, Scale, Zap, Beef, X, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { assessFeedQuality } from "@/lib/feedQuality";

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
  swPerKgDs?: number;
  vwPerKgDs?: number;
  pricePerTon?: number;
}

// Fallback roughage feeds if database is not available
const FALLBACK_ROUGHAGE_FEEDS: RoughageEntry[] = [
  { id: "grassilage", name: "grassilage", displayName: "Grassilage", vem: 898, dve: 65, oeb: 45, dsPercent: 35, amount: 0 },
  { id: "maissilage", name: "maissilage", displayName: "Maïssilage", vem: 1028, dve: 48, oeb: -36, dsPercent: 31, amount: 0 },
  { id: "hooi", name: "hooi", displayName: "Hooi", vem: 798, dve: 55, oeb: 28, dsPercent: 85, amount: 0 },
];

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
  const [isEditingKgProduct, setIsEditingKgProduct] = useState(false);
  const [kgProductInput, setKgProductInput] = useState("");
  const [showQuality, setShowQuality] = useState(false);
  
  // Calculate kg Product from kg DS: kg Product = (kg DS × 100) / DS%
  const kgProduct = feed.dsPercent > 0 ? (feed.amount * 100) / feed.dsPercent : 0;
  
  // Assess feed quality
  const quality = useMemo(() => {
    return assessFeedQuality({
      name: feed.displayName,
      vem: feed.vem,
      dve: feed.dve,
      oeb: feed.oeb,
      dsPercent: feed.dsPercent,
    });
  }, [feed]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 items-center">
      {/* Feed name */}
      <div className="col-span-3">
        <div className="text-sm font-medium">{feed.displayName}</div>
        <div className="text-xs text-muted-foreground">
          {feed.dsPercent}% DS | {feed.vem} VEM
        </div>
        <div className="text-xs text-muted-foreground">
          {feed.dve}g DVE | {feed.oeb >= 0 ? '+' : ''}{feed.oeb}g OEB
        </div>
      </div>
      
      {/* DS% input */}
      <div className="col-span-2">
        <div className="text-xs text-muted-foreground text-center">Hoeveelheid (kg DS)</div>
        <Input
          type="number"
          step="0.1"
          value={feed.dsPercent}
          onChange={(e) => onDsPercentChange(feed.id, parseFloat(e.target.value) || 0)}
          className="h-9 text-center font-mono"
        />
      </div>
      
      {/* kg Product input */}
      <div className="col-span-2">
        <div className="text-xs text-muted-foreground text-center">kg Product</div>
        <Input
          type="number"
          step="0.1"
          value={isEditingKgProduct ? kgProductInput : kgProduct.toFixed(1)}
          onFocus={() => {
            setIsEditingKgProduct(true);
            setKgProductInput(kgProduct.toFixed(1));
          }}
          onChange={(e) => {
            setKgProductInput(e.target.value);
          }}
          onBlur={() => {
            const kgProd = parseFloat(kgProductInput) || 0;
            // Calculate kg DS from kg Product: kg DS = (kg Product × DS%) / 100
            const kgDS = (kgProd * feed.dsPercent) / 100;
            onAmountChange(feed.id, kgDS);
            setIsEditingKgProduct(false);
          }}
          className="h-9 text-center font-mono"
        />
      </div>
      
      {/* Contribution */}
      <div className="col-span-3">
        <div className="text-xs text-muted-foreground text-right">Bijdrage</div>
        <div className="text-sm font-mono text-right">
          <span className="text-amber-600">{Math.round(feed.amount * feed.vem).toLocaleString()} VEM</span>
        </div>
      </div>
      
      {/* Remove button */}
      {onRemove && (
        <div className="col-span-2 flex justify-end">
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
      
      {/* Quality Details Panel */}
      {quality && showQuality && (
        <div className={`mt-2 p-3 rounded-lg border ${quality.bgColor} ${quality.borderColor}`}>
          {quality.warnings.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Waarschuwingen:</p>
              <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                {quality.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
          {quality.recommendations.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 Aanbevelingen:</p>
              <ul className="text-xs text-blue-600 list-disc list-inside space-y-1">
                {quality.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {quality.impactEstimate && (
            <div className="text-xs text-gray-700">
              <span className="font-semibold">Geschatte impact:</span> {quality.impactEstimate}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabRapporten() {
  // Fetch feeds from database
  const { data: feedsData } = trpc.feed.list.useQuery();
  const { data: defaultRationsData } = trpc.ration.getDefaults.useQuery();
  
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
  const [nextFeedId, setNextFeedId] = useState(100); // Start after database feeds

  // Mutation to save lab result
  const saveLabFeedMutation = trpc.labReport.saveAsFeed.useMutation({
    onSuccess: (result) => {
      if (result.success && result.feed) {
        console.log('[Lab Upload] Feed saved to database:', result.feed);
      }
    },
    onError: (error) => {
      console.error('[Lab Upload] Failed to save feed:', error);
    }
  });

  // Handle parsed lab report data
  const handleLabReportParsed = useCallback((data: ParsedFeedData) => {
    // Save to database
    saveLabFeedMutation.mutate({
      farmId: 1, // TODO: Get from auth context
      productName: data.productName,
      productType: data.productType,
      vem: data.vem,
      dve: data.dve,
      oeb: data.oeb,
      dsPercent: data.dsPercent,
      sw: data.sw || 0,
      rawProtein: data.rawProtein,
      rawFiber: data.rawFiber,
      sugar: data.sugar,
      starch: data.starch,
    });
    
    // Also add to local state for immediate display
    const newFeed: RoughageEntry = {
      id: `uploaded_${nextFeedId}`,
      name: `uploaded_${nextFeedId}`,
      displayName: `${data.productName} (${data.productType}) 🧪`,
      vem: data.vem,
      dve: data.dve,
      oeb: data.oeb,
      dsPercent: data.dsPercent,
      amount: 0, // User will set the amount
    };
    
    setRoughageFeeds(prev => [...prev, newFeed]);
    setNextFeedId(prev => prev + 1);
    setShowUploadForm(false);
  }, [nextFeedId, saveLabFeedMutation]);

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

  // Calculate roughage totals
  const roughageTotals = useMemo(() => {
    return roughageFeeds.reduce((acc, feed) => ({
      dryMatter: acc.dryMatter + feed.amount,
      vem: acc.vem + (feed.amount * feed.vem),
      dve: acc.dve + (feed.amount * feed.dve),
      oeb: acc.oeb + (feed.amount * feed.oeb),
    }), { dryMatter: 0, vem: 0, dve: 0, oeb: 0 });
  }, [roughageFeeds]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Terug naar Dashboard
            </a>
          </Link>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
              <span className="text-2xl">🧪</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lab Rapporten</h1>
              <p className="text-gray-600 dark:text-gray-400">Ruwvoer en krachtvoer samenstelling</p>
            </div>
          </div>
        </div>

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
                onRemove={feed.id.startsWith('uploaded_') ? handleRemoveRoughageFeed : undefined}
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
      </div>
    </div>
  );
}
