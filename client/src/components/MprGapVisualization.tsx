import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Beef, 
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Equal
} from "lucide-react";

interface MprGapVisualizationProps {
  mprData: {
    milkProduction: number;
    fatPercent: number;
    proteinPercent: number;
    fcm: number;
  };
  totalSupply: {
    vem: number;
    dveGrams: number;
  };
}

/**
 * Calculate VEM requirement based on MPR data
 * Formula: VEM = (6323 + 440 × Fat% + 0.73 × Fat%²) / 1000 × Milk + 5000
 * Simplified: VEM = 442 × FCM + 5000 (maintenance)
 */
function calculateVemRequirement(fcm: number): number {
  return Math.round(442 * fcm + 5000);
}

/**
 * Calculate DVE requirement based on MPR data
 * Formula: DVE = 1.396 × (Milk × Protein% × 10) + 350
 */
function calculateDveRequirement(milkProduction: number, proteinPercent: number): number {
  return Math.round(1.396 * (milkProduction * proteinPercent * 10) + 350);
}

export default function MprGapVisualization({
  mprData,
  totalSupply,
}: MprGapVisualizationProps) {
  const requirements = useMemo(() => ({
    vem: calculateVemRequirement(mprData.fcm),
    dve: calculateDveRequirement(mprData.milkProduction, mprData.proteinPercent),
  }), [mprData]);

  const nutrients = useMemo(() => [
    {
      name: "VEM behoefte (KVEM)",
      shortName: "VEM",
      supply: totalSupply.vem,
      requirement: requirements.vem,
      unit: "",
      icon: Zap,
      formula: `= (6323 + 440 × ${mprData.fatPercent} + 0.73 × ${mprData.fatPercent}²) / 1000 × ${mprData.milkProduction} + 5000`,
    },
    {
      name: "DVE behoefte (g)",
      shortName: "DVE",
      supply: totalSupply.dveGrams,
      requirement: requirements.dve,
      unit: "g",
      icon: Beef,
      formula: `= 1.396 × (${mprData.milkProduction} × ${mprData.proteinPercent} × 10) + 350`,
    },
  ], [totalSupply, requirements, mprData]);

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300">
          Eindresultaat — Na Krachtvoer
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        VEM en DVE dekking na toevoeging van krachtvoer (MPR: {mprData.milkProduction} kg/d, {mprData.fatPercent}% vet, {mprData.proteinPercent}% eiwit)
      </p>

      {nutrients.map((nutrient) => {
        const coverage = nutrient.requirement > 0 
          ? (nutrient.supply / nutrient.requirement) * 100 
          : 0;
        const gap = nutrient.supply - nutrient.requirement;
        const isOk = coverage >= 95;
        
        return (
          <div key={nutrient.shortName} className="p-4 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-purple-200/50 dark:border-purple-700/50">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <nutrient.icon className={`w-4 h-4 ${isOk ? 'text-emerald-600' : 'text-red-600'}`} />
                <span className="font-medium text-sm">{nutrient.name}</span>
              </div>
              {isOk ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            
            {/* Formula */}
            <p className="text-xs font-mono text-muted-foreground mb-3 bg-slate-100 dark:bg-slate-800 p-2 rounded">
              {nutrient.formula}
            </p>
            
            {/* Values */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800">
                <p className="text-xs text-muted-foreground mb-0.5">Behoefte</p>
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(nutrient.requirement).toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded bg-purple-100 dark:bg-purple-900/30">
                <p className="text-xs text-muted-foreground mb-0.5">Aanbod</p>
                <p className="font-bold text-purple-700 dark:text-purple-300">
                  {Math.round(nutrient.supply).toLocaleString()}
                </p>
              </div>
              <div className={`p-2 rounded ${isOk ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <p className="text-xs text-muted-foreground mb-0.5">{nutrient.shortName} dekking</p>
                <p className={`font-bold ${isOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {coverage.toFixed(1)}%
                </p>
              </div>
            </div>
            
            {/* Visual bar */}
            <div className="mt-3">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                {/* Target line at 100% */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10"
                  style={{ left: `${Math.min(100, (100 / Math.max(coverage, 100)) * 100)}%` }}
                />
                {/* Supply bar */}
                <div 
                  className={`h-full rounded-full transition-all ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, (coverage / Math.max(coverage, 100)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span className="font-medium">100% = doel</span>
                <span>{Math.max(100, Math.ceil(coverage))}%</span>
              </div>
            </div>
            
            {/* Gap indicator */}
            <div className={`mt-3 p-2 rounded-lg flex items-center justify-between ${
              isOk 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              <div className="flex items-center gap-1.5">
                {gap >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isOk ? 'Dekking bereikt' : 'Tekort'}
                </span>
              </div>
              <span className="font-bold text-sm">
                {gap >= 0 ? '+' : ''}{Math.round(gap).toLocaleString()} {nutrient.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
