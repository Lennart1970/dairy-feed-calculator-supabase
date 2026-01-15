import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Zap, 
  Beef, 
  FlaskConical,
  AlertTriangle,
  ArrowRight
} from "lucide-react";

interface NutrientGap {
  name: string;
  shortName: string;
  supply: number;
  requirement: number;
  unit: string;
  icon: typeof Zap;
  color: string;
  isOeb?: boolean;
}

interface GapAnalysisVisualizationProps {
  roughageSupply: {
    vem: number;
    dveGrams: number;
    oebGrams: number;
  };
  requirements: {
    vem: number;
    dve: number;
  };
}

export default function GapAnalysisVisualization({
  roughageSupply,
  requirements,
}: GapAnalysisVisualizationProps) {
  const nutrients: NutrientGap[] = useMemo(() => [
    {
      name: "Energie (VEM)",
      shortName: "VEM",
      supply: roughageSupply.vem,
      requirement: requirements.vem,
      unit: "VEM",
      icon: Zap,
      color: "amber",
    },
    {
      name: "Eiwit (DVE)",
      shortName: "DVE",
      supply: roughageSupply.dveGrams,
      requirement: requirements.dve,
      unit: "g",
      icon: Beef,
      color: "blue",
    },
    {
      name: "Pensbalans (OEB)",
      shortName: "OEB",
      supply: roughageSupply.oebGrams,
      requirement: 0,
      unit: "g",
      icon: FlaskConical,
      color: "purple",
      isOeb: true,
    },
  ], [roughageSupply, requirements]);

  // Calculate total gap to fill with concentrate
  const totalVemGap = Math.max(0, requirements.vem - roughageSupply.vem);
  const totalDveGap = Math.max(0, requirements.dve - roughageSupply.dveGrams);

  return (
    <div className="space-y-4">
      {/* Header explaining this is BEFORE concentrate */}
      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Situatie vóór krachtvoer
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Dit toont het tekort uit alleen ruwvoer. Voeg krachtvoer toe in Stap 4 om de tekorten aan te vullen.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Bar Chart for each nutrient */}
      {nutrients.map((nutrient) => {
        const gap = nutrient.supply - nutrient.requirement;
        const percentage = nutrient.requirement > 0 
          ? (nutrient.supply / nutrient.requirement) * 100 
          : (nutrient.isOeb ? (nutrient.supply >= 0 ? 100 : 50) : 0);
        
        // Determine status based on roughage only
        let status: 'surplus' | 'ok' | 'warning' | 'deficit';
        if (nutrient.isOeb) {
          status = nutrient.supply >= 50 ? 'surplus' : nutrient.supply >= 0 ? 'ok' : nutrient.supply >= -50 ? 'warning' : 'deficit';
        } else {
          status = percentage >= 110 ? 'surplus' : percentage >= 100 ? 'ok' : percentage >= 90 ? 'warning' : 'deficit';
        }
        
        const statusColors = {
          surplus: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' },
          ok: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' },
          warning: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100' },
          deficit: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' },
        };
        
        const colors = statusColors[status];
        const Icon = nutrient.icon;
        
        // Calculate gap to fill
        const gapToFill = nutrient.isOeb ? 0 : Math.max(0, nutrient.requirement - nutrient.supply);
        
        return (
          <div key={nutrient.shortName} className="p-4 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${colors.light} dark:bg-opacity-20`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className="font-medium text-sm">{nutrient.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {!nutrient.isOeb && (
                  <Badge variant="outline" className={`${colors.text} border-current`}>
                    {Math.round(percentage)}% uit ruwvoer
                  </Badge>
                )}
                {gap > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : gap < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            
            {/* Visual Bar - Roughage only */}
            <div className="relative">
              {/* Background track */}
              <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden relative">
                {/* Target line at 100% */}
                {!nutrient.isOeb && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                    style={{ left: `${Math.min(100, (100 / Math.max(percentage, 100)) * 100)}%` }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 whitespace-nowrap">
                      Doel
                    </div>
                  </div>
                )}
                
                {/* OEB zero line */}
                {nutrient.isOeb && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                    style={{ left: '50%' }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
                      0
                    </div>
                  </div>
                )}
                
                {/* Roughage bar only */}
                <div 
                  className={`absolute top-1 bottom-1 left-1 rounded transition-all ${
                    nutrient.isOeb 
                      ? nutrient.supply >= 0 ? 'bg-emerald-400' : 'bg-red-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ 
                    width: nutrient.isOeb 
                      ? `${Math.min(49, Math.abs(nutrient.supply) / 4)}%`
                      : `${Math.min(98, (percentage / Math.max(percentage, 100)) * 98)}%`,
                    marginLeft: nutrient.isOeb && nutrient.supply < 0 
                      ? `${50 - Math.min(49, Math.abs(nutrient.supply) / 4)}%` 
                      : nutrient.isOeb ? '50%' : '0'
                  }}
                />
                
                {/* Gap indicator (dashed area showing what needs to be filled) */}
                {!nutrient.isOeb && percentage < 100 && (
                  <div 
                    className="absolute top-1 bottom-1 rounded border-2 border-dashed border-orange-400 bg-orange-100/30 dark:bg-orange-900/20"
                    style={{ 
                      left: `${Math.min(98, (percentage / Math.max(percentage, 100)) * 98) + 1}%`,
                      width: `${Math.max(0, 98 - (percentage / Math.max(percentage, 100)) * 98 - 1)}%`
                    }}
                  />
                )}
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-emerald-400"></div>
                    <span className="text-muted-foreground">Ruwvoer aanbod</span>
                  </div>
                  {!nutrient.isOeb && percentage < 100 && (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded border-2 border-dashed border-orange-400 bg-orange-100/30"></div>
                      <span className="text-muted-foreground">Te vullen met krachtvoer</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Numbers - Simplified for roughage only */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-700">
                <p className="text-xs text-muted-foreground mb-0.5">Behoefte</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {nutrient.isOeb ? '≥ 0' : Math.round(nutrient.requirement).toLocaleString()}
                  {!nutrient.isOeb && <span className="text-xs ml-1">{nutrient.unit}</span>}
                </p>
              </div>
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-xs text-muted-foreground mb-0.5">Ruwvoer</p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {nutrient.isOeb && nutrient.supply >= 0 ? '+' : ''}
                  {Math.round(nutrient.supply).toLocaleString()}
                  <span className="text-xs ml-1">{nutrient.unit}</span>
                </p>
              </div>
              <div className={`p-2 rounded ${gapToFill > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : colors.light + ' dark:bg-opacity-20'}`}>
                <p className="text-xs text-muted-foreground mb-0.5">
                  {nutrient.isOeb ? 'Status' : gapToFill > 0 ? 'Tekort' : 'Overschot'}
                </p>
                <p className={`font-semibold ${gapToFill > 0 ? 'text-orange-700 dark:text-orange-400' : colors.text}`}>
                  {nutrient.isOeb 
                    ? (nutrient.supply >= 0 ? 'OK' : 'Tekort')
                    : gapToFill > 0 
                      ? `-${Math.round(gapToFill).toLocaleString()} ${nutrient.unit}`
                      : `+${Math.round(Math.abs(gap)).toLocaleString()} ${nutrient.unit}`
                  }
                </p>
              </div>
            </div>
            
            {/* Action indicator for deficits */}
            {!nutrient.isOeb && gapToFill > 0 && (
              <div className="mt-3 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    Voeg <strong>{Math.round(gapToFill).toLocaleString()} {nutrient.unit}</strong> toe via krachtvoer in Stap 4
                  </span>
                </div>
              </div>
            )}
            
            {/* Success indicator for surpluses */}
            {!nutrient.isOeb && gapToFill === 0 && (
              <div className="mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    Ruwvoer dekt de behoefte volledig (+{Math.round(Math.abs(gap)).toLocaleString()} {nutrient.unit} overschot)
                  </span>
                </div>
              </div>
            )}
            
            {/* OEB status */}
            {nutrient.isOeb && (
              <div className={`mt-3 p-2 rounded-lg ${
                nutrient.supply >= 0 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  {nutrient.supply >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>Pensbalans positief - voldoende stikstof voor pensmicroben</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Pensbalans negatief - voeg eiwitrijk krachtvoer toe (bijv. raapzaadschroot)</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Summary box */}
      {(totalVemGap > 0 || totalDveGap > 0) && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
          <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Krachtvoer Strategie
          </h4>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Op basis van het ruwvoer is er nog een tekort van{' '}
            {totalVemGap > 0 && <strong>{Math.round(totalVemGap).toLocaleString()} VEM</strong>}
            {totalVemGap > 0 && totalDveGap > 0 && ' en '}
            {totalDveGap > 0 && <strong>{Math.round(totalDveGap).toLocaleString()} g DVE</strong>}
            . Ga naar Stap 4 om krachtvoer toe te voegen.
          </p>
        </div>
      )}
    </div>
  );
}
