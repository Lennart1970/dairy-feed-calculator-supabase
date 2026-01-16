import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Save, 
  Euro, 
  Wheat, 
  Package, 
  Leaf,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface FeedPrice {
  id: number;
  name: string;
  displayName: string;
  category: string | null;
  pricePerTon: number | null;
  vemPerUnit: number;
  dvePerUnit: number;
  swPerKgDs: number | null;
  vwPerKgDs: number | null;
  isActive: boolean;
}

export default function FeedManagement() {
  const { data: feedsData, refetch } = trpc.feeds.list.useQuery();
  const updatePriceMutation = trpc.feeds.updatePrice.useMutation({
    onSuccess: () => {
      refetch();
    }
  });
  
  // Local state for edited prices
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<number, 'saving' | 'saved' | 'error'>>({});
  
  // Group feeds by category
  const feedsByCategory = useMemo(() => {
    if (!feedsData) return {};
    
    const grouped: Record<string, FeedPrice[]> = {
      roughage: [],
      byproduct: [],
      compound: [],
      protein_energy: [],
      other: [],
    };
    
    feedsData.forEach(feed => {
      const category = feed.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        id: feed.id,
        name: feed.name,
        displayName: feed.displayName,
        category: feed.category,
        pricePerTon: feed.pricePerTon,
        vemPerUnit: feed.vemPerUnit,
        dvePerUnit: feed.dvePerUnit,
        swPerKgDs: feed.swPerKgDs,
        vwPerKgDs: feed.vwPerKgDs,
        isActive: feed.isActive ?? true,
      });
    });
    
    return grouped;
  }, [feedsData]);
  
  // Handle price change
  const handlePriceChange = (feedId: number, value: string) => {
    setEditedPrices(prev => ({
      ...prev,
      [feedId]: value
    }));
  };
  
  // Save price for a single feed
  const handleSavePrice = async (feedId: number) => {
    const priceStr = editedPrices[feedId];
    if (priceStr === undefined) return;
    
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      setSaveStatus(prev => ({ ...prev, [feedId]: 'error' }));
      return;
    }
    
    setSaveStatus(prev => ({ ...prev, [feedId]: 'saving' }));
    
    try {
      await updatePriceMutation.mutateAsync({ feedId, pricePerTon: price });
      setSaveStatus(prev => ({ ...prev, [feedId]: 'saved' }));
      // Clear edited price after successful save
      setEditedPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[feedId];
        return newPrices;
      });
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[feedId];
          return newStatus;
        });
      }, 2000);
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, [feedId]: 'error' }));
    }
  };
  
  // Category display info
  const categoryInfo: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    roughage: { label: 'Ruwvoer', icon: <Leaf className="w-4 h-4" />, color: 'bg-green-100 text-green-800' },
    byproduct: { label: 'Bijproducten', icon: <Package className="w-4 h-4" />, color: 'bg-amber-100 text-amber-800' },
    compound: { label: 'Mengvoer', icon: <Wheat className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800' },
    protein_energy: { label: 'Eiwit/Energie', icon: <Package className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' },
    other: { label: 'Overig', icon: <Package className="w-4 h-4" />, color: 'bg-slate-100 text-slate-800' },
  };
  
  // Render feed table for a category
  const renderFeedTable = (feeds: FeedPrice[], categoryKey: string) => {
    if (!feeds || feeds.length === 0) return null;
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Voermiddel</TableHead>
            <TableHead className="text-center">VEM</TableHead>
            <TableHead className="text-center">DVE (g)</TableHead>
            <TableHead className="text-center">SW</TableHead>
            <TableHead className="text-center">VW</TableHead>
            <TableHead className="text-right">Prijs (€/ton)</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feeds.map(feed => {
            const isEdited = editedPrices[feed.id] !== undefined;
            const currentPrice = isEdited ? editedPrices[feed.id] : (feed.pricePerTon?.toString() || '');
            const status = saveStatus[feed.id];
            
            return (
              <TableRow key={feed.id} className={!feed.isActive ? 'opacity-50' : ''}>
                <TableCell>
                  <div className="font-medium">{feed.displayName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{feed.name}</div>
                </TableCell>
                <TableCell className="text-center font-mono">{feed.vemPerUnit}</TableCell>
                <TableCell className="text-center font-mono">{feed.dvePerUnit}</TableCell>
                <TableCell className="text-center font-mono">{feed.swPerKgDs?.toFixed(2) || '-'}</TableCell>
                <TableCell className="text-center font-mono">{feed.vwPerKgDs?.toFixed(2) || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Euro className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentPrice}
                      onChange={(e) => handlePriceChange(feed.id, e.target.value)}
                      className="w-24 h-8 text-right font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isEdited && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSavePrice(feed.id)}
                        disabled={status === 'saving'}
                      >
                        {status === 'saving' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {status === 'saved' && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    {status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };
  
  // Calculate totals
  const totalFeeds = feedsData?.length || 0;
  const feedsWithPrices = feedsData?.filter(f => f.pricePerTon && f.pricePerTon > 0).length || 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Terug naar Calculator
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Voermiddelen Beheer</h1>
                <p className="text-sm text-muted-foreground">Beheer prijzen en eigenschappen van voermiddelen</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {feedsWithPrices} / {totalFeeds} prijzen ingesteld
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(categoryInfo).map(([key, info]) => {
            const feeds = feedsByCategory[key] || [];
            const withPrices = feeds.filter(f => f.pricePerTon && f.pricePerTon > 0).length;
            return (
              <Card key={key}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${info.color}`}>
                      {info.icon}
                    </div>
                    <div>
                      <div className="font-medium">{info.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {withPrices} / {feeds.length} prijzen
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Feed Tables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Voermiddelen & Prijzen
            </CardTitle>
            <CardDescription>
              Klik op een prijs om te bewerken. Prijzen worden per ton (1000 kg) ingevoerd.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="roughage">
              <TabsList className="mb-4">
                {Object.entries(categoryInfo).map(([key, info]) => {
                  const feeds = feedsByCategory[key] || [];
                  if (feeds.length === 0) return null;
                  return (
                    <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                      {info.icon}
                      {info.label}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {feeds.length}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {Object.entries(categoryInfo).map(([key, info]) => {
                const feeds = feedsByCategory[key] || [];
                if (feeds.length === 0) return null;
                return (
                  <TabsContent key={key} value={key}>
                    {renderFeedTable(feeds, key)}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Help Text */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Over Voermiddelen Beheer</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Alle voermiddelen worden opgeslagen in de database. U kunt hier prijzen instellen 
                  voor kostenberekeningen. De voedingswaarden (VEM, DVE, SW, VW) komen uit de CVB 
                  Veevoedertabel 2025 en kunnen alleen door een beheerder worden aangepast.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
