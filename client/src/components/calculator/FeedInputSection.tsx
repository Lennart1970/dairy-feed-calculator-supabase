/**
 * FeedInputSection Component
 * 
 * Handles feed input rows and totals display.
 * Extracted from CalculatorForm.tsx for better maintainability.
 * 
 * Responsibilities:
 * - Display feed input rows
 * - Handle amount and DS% changes
 * - Show feed contributions (VEM, DVE, OEB)
 * - Display section totals
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Wheat, FlaskConical } from "lucide-react";
import type { FeedData, FeedInput } from "@/lib/calculator";

// Types
export interface FeedInputState {
  [feedName: string]: FeedInput;
}

export interface FeedInputSectionProps {
  title: string;
  icon: "roughage" | "concentrate";
  feeds: FeedData[];
  feedInputs: FeedInputState;
  onAmountChange: (feedName: string, value: string) => void;
  onDsPercentChange: (feedName: string, value: string) => void;
  showDsPercent?: boolean;
  totals?: {
    dryMatter: number;
    vem: number;
    dve: number;
    oeb: number;
  };
}

/**
 * Single feed input row
 */
function FeedInputRow({
  feed,
  input,
  onAmountChange,
  onDsPercentChange,
  showDsPercent = true,
}: {
  feed: FeedData;
  input: FeedInput | undefined;
  onAmountChange: (value: string) => void;
  onDsPercentChange: (value: string) => void;
  showDsPercent?: boolean;
}) {
  const amount = input?.amountKg || 0;
  const dsPercent = input?.dsPercent || feed.defaultDsPercent;
  
  // Calculate contributions
  const dryMatterKg = feed.basis === 'kg DS' 
    ? amount 
    : amount * (dsPercent / 100);
  
  const vemContribution = dryMatterKg * feed.vemPerUnit;
  const dveContribution = dryMatterKg * feed.dvePerUnit;
  const oebContribution = dryMatterKg * feed.oebPerUnit;

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-border/50 last:border-0">
      {/* Feed name */}
      <div className="col-span-3">
        <Label className="text-sm font-medium truncate block" title={feed.displayName}>
          {feed.displayName}
        </Label>
        <span className="text-xs text-muted-foreground">
          {feed.vemPerUnit} VEM/{feed.basis === 'kg DS' ? 'kg DS' : 'kg'}
        </span>
      </div>
      
      {/* Amount input */}
      <div className="col-span-2">
        <Input
          type="number"
          step="0.1"
          min="0"
          value={amount || ''}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0"
          className="h-8 text-sm"
        />
      </div>
      
      {/* DS% input (only for roughage) */}
      {showDsPercent && (
        <div className="col-span-2">
          <Input
            type="number"
            step="1"
            min="0"
            max="100"
            value={dsPercent || ''}
            onChange={(e) => onDsPercentChange(e.target.value)}
            placeholder={feed.defaultDsPercent.toString()}
            className="h-8 text-sm"
          />
        </div>
      )}
      
      {/* Contributions */}
      <div className={`${showDsPercent ? 'col-span-5' : 'col-span-7'} grid grid-cols-4 gap-1 text-xs text-right`}>
        <span className="text-muted-foreground">
          {dryMatterKg.toFixed(1)} DS
        </span>
        <span className="font-medium text-emerald-600">
          {Math.round(vemContribution).toLocaleString()}
        </span>
        <span className="font-medium text-blue-600">
          {Math.round(dveContribution)}
        </span>
        <span className={`font-medium ${oebContribution >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
          {oebContribution >= 0 ? '+' : ''}{Math.round(oebContribution)}
        </span>
      </div>
    </div>
  );
}

/**
 * Section totals row
 */
function SectionTotals({ totals }: { totals: FeedInputSectionProps['totals'] }) {
  if (!totals) return null;
  
  return (
    <div className="mt-3 pt-3 border-t-2 border-primary/20">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3">
          <span className="text-sm font-bold text-primary">Totaal</span>
        </div>
        <div className="col-span-2">
          {/* Empty for amount column */}
        </div>
        <div className="col-span-2">
          {/* Empty for DS% column */}
        </div>
        <div className="col-span-5 grid grid-cols-4 gap-1 text-sm text-right font-bold">
          <span className="text-muted-foreground">
            {totals.dryMatter.toFixed(1)} DS
          </span>
          <span className="text-emerald-600">
            {Math.round(totals.vem).toLocaleString()}
          </span>
          <span className="text-blue-600">
            {Math.round(totals.dve)}
          </span>
          <span className={totals.oeb >= 0 ? 'text-amber-600' : 'text-red-600'}>
            {totals.oeb >= 0 ? '+' : ''}{Math.round(totals.oeb)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Main FeedInputSection component
 */
export default function FeedInputSection({
  title,
  icon,
  feeds,
  feedInputs,
  onAmountChange,
  onDsPercentChange,
  showDsPercent = true,
  totals,
}: FeedInputSectionProps) {
  const Icon = icon === "roughage" ? Wheat : FlaskConical;
  const iconColor = icon === "roughage" ? "text-green-600" : "text-purple-600";
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          {title}
        </CardTitle>
        
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground mt-2 pb-1 border-b">
          <div className="col-span-3">Voermiddel</div>
          <div className="col-span-2">kg {showDsPercent ? 'product' : 'DS'}</div>
          {showDsPercent && <div className="col-span-2">DS %</div>}
          <div className={`${showDsPercent ? 'col-span-5' : 'col-span-7'} grid grid-cols-4 gap-1 text-right`}>
            <span>kg DS</span>
            <span>VEM</span>
            <span>DVE</span>
            <span>OEB</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Geen voermiddelen beschikbaar
          </p>
        ) : (
          <>
            {feeds.map((feed) => (
              <FeedInputRow
                key={feed.name}
                feed={feed}
                input={feedInputs[feed.name]}
                onAmountChange={(value) => onAmountChange(feed.name, value)}
                onDsPercentChange={(value) => onDsPercentChange(feed.name, value)}
                showDsPercent={showDsPercent}
              />
            ))}
            <SectionTotals totals={totals} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Calculate section totals from feeds and inputs
 */
export function calculateSectionTotals(
  feeds: FeedData[],
  feedInputs: FeedInputState
): { dryMatter: number; vem: number; dve: number; oeb: number } {
  let dryMatter = 0;
  let vem = 0;
  let dve = 0;
  let oeb = 0;
  
  for (const feed of feeds) {
    const input = feedInputs[feed.name];
    if (!input || input.amountKg <= 0) continue;
    
    const dsPercent = input.dsPercent || feed.defaultDsPercent;
    const dryMatterKg = feed.basis === 'kg DS' 
      ? input.amountKg 
      : input.amountKg * (dsPercent / 100);
    
    dryMatter += dryMatterKg;
    vem += dryMatterKg * feed.vemPerUnit;
    dve += dryMatterKg * feed.dvePerUnit;
    oeb += dryMatterKg * feed.oebPerUnit;
  }
  
  return { dryMatter, vem, dve, oeb };
}
