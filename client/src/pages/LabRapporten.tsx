import { useState, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { LabReportUpload, type ParsedFeedData } from "@/components/LabReportUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, ArrowLeft } from "lucide-react";
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

// Feed quality display row component (simplified - no amount inputs)
function FeedQualityRow({ 
  feed, 
  onRemove 
}: { 
  feed: RoughageEntry; 
  onRemove?: (id: string) => void;
}) {
  // Assess feed quality
  const quality = useMemo(() => {
    return assessFeedQuality(
      feed.displayName,
      feed.vem,
      feed.dve,
      feed.oeb
    );
  }, [feed]);

  // Determine quality indicator color
  const qualityColor = quality?.overallScore === 'good' ? 'text-green-600' 
    : quality?.overallScore === 'warning' ? 'text-yellow-600' 
    : quality?.overallScore === 'poor' ? 'text-red-600' 
    : 'text-gray-600';

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      {/* Feed name and source indicator */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{feed.displayName}</span>
          {feed.id.startsWith('uploaded_') && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-cyan-100 text-cyan-700 rounded">🧪 Lab</span>
          )}
        </div>
      </div>
      
      {/* DS% */}
      <div className="w-16 text-center">
        <div className="text-xs text-muted-foreground">DS%</div>
        <div className="text-sm font-mono font-medium">{feed.dsPercent}%</div>
      </div>
      
      {/* VEM */}
      <div className="w-20 text-center">
        <div className="text-xs text-muted-foreground">VEM</div>
        <div className="text-sm font-mono font-medium text-amber-600">{feed.vem}</div>
      </div>
      
      {/* DVE */}
      <div className="w-16 text-center">
        <div className="text-xs text-muted-foreground">DVE</div>
        <div className="text-sm font-mono font-medium text-blue-600">{feed.dve}g</div>
      </div>
      
      {/* OEB */}
      <div className="w-16 text-center">
        <div className="text-xs text-muted-foreground">OEB</div>
        <div className={`text-sm font-mono font-medium ${feed.oeb >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {feed.oeb >= 0 ? '+' : ''}{feed.oeb}g
        </div>
      </div>
      
      {/* SW (if available) */}
      {feed.swPerKgDs !== undefined && (
        <div className="w-14 text-center">
          <div className="text-xs text-muted-foreground">SW</div>
          <div className="text-sm font-mono font-medium text-purple-600">{feed.swPerKgDs}</div>
        </div>
      )}
      
      {/* Remove button */}
      {onRemove && (
        <div className="ml-2">
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

            {/* Column headers */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-t-lg border border-gray-200 border-b-0">
              <div className="flex-1 text-xs font-medium text-gray-500">Voeder</div>
              <div className="w-16 text-center text-xs font-medium text-gray-500">DS%</div>
              <div className="w-20 text-center text-xs font-medium text-gray-500">VEM</div>
              <div className="w-16 text-center text-xs font-medium text-gray-500">DVE</div>
              <div className="w-16 text-center text-xs font-medium text-gray-500">OEB</div>
              <div className="w-14 text-center text-xs font-medium text-gray-500">SW</div>
              <div className="w-8"></div>
            </div>

            {/* Feed quality rows */}
            <div className="space-y-1">
              {roughageFeeds.map((feed) => (
                <FeedQualityRow
                  key={feed.id}
                  feed={feed}
                  onRemove={handleRemoveRoughageFeed}
                />
              ))}
            </div>

            {/* Info note */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Tip:</strong> Deze voederwaarden worden gebruikt in de <strong>Rantsoen Toewijzing</strong> (PMR per groep) 
                en de <strong>Rantsoen Calculator</strong> (per koe). Upload lab rapporten om de echte waarden van uw ruwvoer te gebruiken.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
