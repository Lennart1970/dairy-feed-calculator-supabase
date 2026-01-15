import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { type FeedInput } from "@/lib/calculator";

interface Feed {
  name: string;
  displayName: string;
  vemPerUnit: number;
  dvePerUnit: number;
  oebPerUnit: number;
  basis: string;
  defaultDsPercent: number;
}

interface ConcentrateFeedSectionProps {
  concentrateFeeds: Feed[];
  feedInputs: Record<string, FeedInput>;
  onFeedAmountChange: (feedName: string, value: string) => void;
  onDsPercentChange: (feedName: string, value: string) => void;
}

export default function ConcentrateFeedSection({
  concentrateFeeds,
  feedInputs,
  onFeedAmountChange,
  onDsPercentChange,
}: ConcentrateFeedSectionProps) {
  // Feed input component
  const FeedInputRow = ({ feed }: { feed: Feed }) => {
    const input = feedInputs[feed.name] || { amountKg: 0, dsPercent: feed.defaultDsPercent };
    const unitLabel = feed.basis === "per kg DS" ? "kg DS" : "kg product";
    
    return (
      <div className="space-y-2 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
        <div className="flex items-center justify-between">
          <Label className="font-medium text-sm">{feed.displayName}</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {feed.vemPerUnit} VEM | {feed.dvePerUnit}g DVE | {feed.oebPerUnit > 0 ? "+" : ""}{feed.oebPerUnit}g OEB
          </span>
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-2">
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
              onChange={(e) => onFeedAmountChange(feed.name, e.target.value)}
              placeholder="0"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${feed.name}-ds`} className="text-xs text-muted-foreground">
              DS%
            </Label>
            <Input
              id={`${feed.name}-ds`}
              type="number"
              min="0"
              max="100"
              step="1"
              value={input.dsPercent || ""}
              onChange={(e) => onDsPercentChange(feed.name, e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50/30 dark:from-orange-950/40 dark:to-red-950/20 border-l-4 border-l-orange-500 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div>
            <span className="text-orange-700 dark:text-orange-400">Krachtvoer</span>
            <span className="text-muted-foreground font-normal text-sm ml-2">— Het Vulmateriaal</span>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Pas krachtvoer aan om de balans te optimaliseren. Wijzigingen worden direct zichtbaar in de Voedingsbalans.
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
}
