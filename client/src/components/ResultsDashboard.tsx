import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type CalculationResult, type NutrientBalance, type StructureValueResult } from "@/lib/calculator";
import { Activity, Zap, FlaskConical, Droplets, Wheat, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { type MprData } from "./MprInput";
import VOCIndicator from "./VOCIndicator";

interface ResultsDashboardProps {
  result: CalculationResult | null;
  mprData?: MprData | null;
}

function StatusBadge({ status }: { status: 'ok' | 'warning' | 'deficient' }) {
  const config = {
    ok: { icon: '✅', label: 'OK', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    warning: { icon: '⚠️', label: 'Waarschuwing', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    deficient: { icon: '🔴', label: 'Tekort', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };
  
  const { icon, className } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {icon}
    </span>
  );
}

// Dutch translations for parameter names
function translateParameter(param: string): string {
  const translations: Record<string, string> = {
    'Dry Matter Intake': 'Droge Stof Opname',
    'Energy (VEM)': 'Energie (VEM)',
    'Protein (DVE)': 'Eiwit (DVE)',
    'OEB': 'OEB',
    'Calcium (Ca)': 'Calcium (Ca)',
    'Phosphorus (P)': 'Fosfor (P)',
  };
  return translations[param] || param;
}

function BalanceIndicator({ balance }: { balance: NutrientBalance }) {
  const maxDeviation = balance.requirement > 0 ? balance.requirement * 0.3 : 100;
  const deviation = balance.balance;
  const normalizedPosition = 50 + (deviation / maxDeviation) * 50;
  const position = Math.max(5, Math.min(95, normalizedPosition));
  
  const indicatorColor = balance.status === 'ok' 
    ? 'bg-emerald-500' 
    : balance.status === 'warning' 
    ? 'bg-amber-500' 
    : 'bg-red-500';
  
  const indicatorShadow = balance.status === 'ok' 
    ? 'shadow-emerald-500/50' 
    : balance.status === 'warning' 
    ? 'shadow-amber-500/50' 
    : 'shadow-red-500/50';

  // Check if this is a mineral (Ca or P) to show disclaimer
  const isMineral = balance.parameter.includes('Calcium') || balance.parameter.includes('Phosphorus');

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{translateParameter(balance.parameter)}</span>
        <StatusBadge status={balance.status} />
      </div>
      
      <div className="relative">
        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="w-1/2 bg-gradient-to-r from-red-200 via-red-100 to-slate-100 dark:from-red-900/40 dark:via-red-800/20 dark:to-slate-700/30"></div>
          <div className="w-1/2 bg-gradient-to-r from-slate-100 via-emerald-100 to-emerald-200 dark:from-slate-700/30 dark:via-emerald-800/20 dark:to-emerald-900/40"></div>
        </div>
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-400 dark:bg-slate-500"></div>
        
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${indicatorColor} shadow-lg ${indicatorShadow} border-2 border-white dark:border-slate-800 transition-all duration-500 ease-out flex items-center justify-center`}
          style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
        >
          <div className="w-2 h-2 rounded-full bg-white/40"></div>
        </div>
      </div>
      
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Tekort</span>
        <span className="font-medium text-slate-600 dark:text-slate-400">Doel</span>
        <span>Overschot</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-left">
          <span className="text-muted-foreground">Behoefte</span>
          <p className="font-medium">{balance.requirement.toLocaleString()} {balance.unit}</p>
        </div>
        <div className="text-center">
          <span className={balance.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
            Balans
          </span>
          <p className={`font-bold ${balance.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {balance.balance >= 0 ? '+' : ''}{balance.balance.toLocaleString()} {balance.unit}
          </p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Aanbod</span>
          <p className="font-medium">{balance.supply.toLocaleString()} {balance.unit}</p>
        </div>
      </div>
      
      {/* Disclaimer for minerals (Ca/P) */}
      {isMineral && (
        <p className="text-[10px] text-muted-foreground italic text-center pt-1">
          * Gebaseerd op standaard CVB-tabelwaarden
        </p>
      )}
    </div>
  );
}

/**
 * OEB Threshold Indicator - Shows OEB as a minimum threshold (≥0 is good)
 * Different from regular balance indicators because OEB just needs to be ≥0
 */
function OebThresholdIndicator({ balance }: { balance: NutrientBalance }) {
  const oebValue = balance.supply;
  const isOk = oebValue >= 0;
  
  // For OEB, we show a simple threshold bar where 0 is the threshold
  // Left of threshold = red (deficit), right of threshold = green (OK)
  // Position the indicator based on the OEB value
  // Range: -500 to +500 for visualization purposes
  const maxRange = 500;
  const normalizedValue = Math.max(-maxRange, Math.min(maxRange, oebValue));
  const position = ((normalizedValue + maxRange) / (2 * maxRange)) * 100;
  const clampedPosition = Math.max(5, Math.min(95, position));
  
  const indicatorColor = isOk ? 'bg-emerald-500' : 'bg-red-500';
  const indicatorShadow = isOk ? 'shadow-emerald-500/50' : 'shadow-red-500/50';
  const status = isOk ? 'ok' : 'deficient';

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-1.5">
          <FlaskConical className="w-4 h-4 text-blue-600" />
          Pensbalans (OEB)
        </span>
        <StatusBadge status={status as 'ok' | 'warning' | 'deficient'} />
      </div>
      
      <div className="relative">
        {/* Background bar: red on left (deficit), green on right (OK) */}
        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="w-1/2 bg-gradient-to-r from-red-300 via-red-200 to-red-100 dark:from-red-900/60 dark:via-red-800/40 dark:to-red-700/20"></div>
          <div className="w-1/2 bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-300 dark:from-emerald-700/20 dark:via-emerald-800/40 dark:to-emerald-900/60"></div>
        </div>
        
        {/* Zero threshold marker */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-600 dark:bg-slate-400"></div>
        
        {/* Indicator dot */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${indicatorColor} shadow-lg ${indicatorShadow} border-2 border-white dark:border-slate-800 transition-all duration-500 ease-out flex items-center justify-center`}
          style={{ left: `${clampedPosition}%`, transform: `translateX(-50%) translateY(-50%)` }}
        >
          <div className="w-2 h-2 rounded-full bg-white/40"></div>
        </div>
      </div>
      
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span className="text-red-500">Tekort (negatief)</span>
        <span className="font-medium text-slate-600 dark:text-slate-400">Drempel (≥0)</span>
        <span className="text-emerald-500">OK (positief)</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-left">
          <span className="text-muted-foreground">Minimum</span>
          <p className="font-medium">≥ 0 {balance.unit}</p>
        </div>
        <div className="text-center">
          <span className={isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
            Status
          </span>
          <p className={`font-bold ${isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isOk ? 'OK' : 'Tekort'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Waarde</span>
          <p className={`font-medium ${isOk ? 'text-emerald-600' : 'text-red-600'}`}>
            {oebValue >= 0 ? '+' : ''}{oebValue.toLocaleString()} {balance.unit}
          </p>
        </div>
      </div>
    </div>
  );
}

function VOCCompactIndicator({ vocResult }: { vocResult: any }) {
  const { vocCapacity, totalVW, saturationPercent, status, message } = vocResult;
  
  // Determine color and icon based on status
  const getStatusConfig = () => {
    switch (status) {
      case 'ok':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600',
          badge: 'ok' as const,
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600',
          badge: 'warning' as const,
        };
      case 'exceeded':
        return {
          icon: XCircle,
          color: 'text-red-600',
          badge: 'deficient' as const,
        };
      default:
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600',
          badge: 'ok' as const,
        };
    }
  };
  
  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-purple-600" />
          Opnamecapaciteit (VOC)
        </span>
        <StatusBadge status={config.badge} />
      </div>
      
      {/* Progress bar for saturation */}
      <div className="space-y-2">
        <div className="relative h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-500 ${
              status === 'ok' ? 'bg-emerald-500' : 
              status === 'warning' ? 'bg-amber-500' : 
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(saturationPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          <span>0%</span>
          <span className="font-medium text-slate-600 dark:text-slate-400">50%</span>
          <span>100%</span>
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-left">
          <span className="text-muted-foreground">VOC Capaciteit</span>
          <p className="font-medium">{vocCapacity} kg DS</p>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground">Totaal VW</span>
          <p className="font-medium">{totalVW}</p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Verzadiging</span>
          <p className={`font-bold ${config.color}`}>{saturationPercent}%</p>
        </div>
      </div>
      
      {/* Status message */}
      <p className="text-xs text-muted-foreground italic">{message}</p>
      
      {/* Info note */}
      <p className="text-xs text-muted-foreground">
        <strong>VOC (Voeropnamecapaciteit):</strong> De maximale hoeveelheid droge stof die een koe kan opnemen, afhankelijk van lactatie, dagen in melk en dracht. VW (Verzadigingswaarde) meet hoe verzadigend elk voer is.
      </p>
    </div>
  );
}

function StructureValueIndicator({ structureValue }: { structureValue: StructureValueResult }) {
  const { swPerKgDs, requirement, status, message } = structureValue;
  
  // Calculate position on the balance indicator (similar to other nutrients)
  // SW target is 1.0, so we center on that
  const maxDeviation = 0.3; // 30% deviation range
  const deviation = swPerKgDs - requirement;
  const normalizedPosition = 50 + (deviation / maxDeviation) * 50;
  const position = Math.max(5, Math.min(95, normalizedPosition));
  
  const indicatorColor = status === 'ok' 
    ? 'bg-emerald-500' 
    : status === 'warning' 
    ? 'bg-amber-500' 
    : 'bg-red-500';
  
  const indicatorShadow = status === 'ok' 
    ? 'shadow-emerald-500/50' 
    : status === 'warning' 
    ? 'shadow-amber-500/50' 
    : 'shadow-red-500/50';

  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-1.5">
          <Wheat className="w-4 h-4 text-amber-600" />
          Structuurwaarde (SW)
        </span>
        <StatusBadge status={status} />
      </div>
      
      <div className="relative">
        <div className="h-3 rounded-full overflow-hidden flex">
          <div className="w-1/2 bg-gradient-to-r from-red-200 via-red-100 to-slate-100 dark:from-red-900/40 dark:via-red-800/20 dark:to-slate-700/30"></div>
          <div className="w-1/2 bg-gradient-to-r from-slate-100 via-emerald-100 to-emerald-200 dark:from-slate-700/30 dark:via-emerald-800/20 dark:to-emerald-900/40"></div>
        </div>
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-400 dark:bg-slate-500"></div>
        
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${indicatorColor} shadow-lg ${indicatorShadow} border-2 border-white dark:border-slate-800 transition-all duration-500 ease-out flex items-center justify-center`}
          style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
        >
          <div className="w-2 h-2 rounded-full bg-white/40"></div>
        </div>
      </div>
      
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Tekort</span>
        <span className="font-medium text-slate-600 dark:text-slate-400">Doel (≥1.00)</span>
        <span>Overschot</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-left">
          <span className="text-muted-foreground">Minimum</span>
          <p className="font-medium">{requirement.toFixed(2)} / kg DS</p>
        </div>
        <div className="text-center">
          <span className={deviation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
            Balans
          </span>
          <p className={`font-bold ${deviation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {deviation >= 0 ? '+' : ''}{deviation.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Actueel</span>
          <p className="font-medium">{swPerKgDs.toFixed(2)} / kg DS</p>
        </div>
      </div>
    </div>
  );
}

export default function ResultsDashboard({ result, mprData }: ResultsDashboardProps) {
  if (!result) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Activity className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium">Voer hoeveelheden in om resultaten te zien</p>
            <p className="text-sm mt-1">De voedingsbalans wordt direct bijgewerkt</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate OEB from other balances for special rendering
  const oebBalance = result.balances.find(b => b.parameter === 'OEB');
  // Filter out minerals (Ca, P) - will be added in v2
  const otherBalances = result.balances.filter(b => 
    b.parameter !== 'OEB' && 
    !b.parameter.includes('Calcium') && 
    !b.parameter.includes('Phosphorus')
  );

  return (
    <div className="space-y-6">
      {/* Nutrient Balance Details - Main Dashboard with VOC and SW integrated */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-purple-600" />
            </div>
            Voedingsbalans Details
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Middenlijn = doel bereikt • Links = tekort • Rechts = overschot
          </p>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {/* VOC Indicator - First in the list */}
            {result.vocResult && (
              <VOCCompactIndicator vocResult={result.vocResult} />
            )}
            
            {/* Structure Value (SW) */}
            {result.structureValue && (
              <StructureValueIndicator structureValue={result.structureValue} />
            )}
            
            {/* Other nutrient balances (excluding OEB) */}
            {otherBalances.map((balance) => (
              <BalanceIndicator key={balance.parameter} balance={balance} />
            ))}
            
            {/* OEB with special threshold indicator */}
            {oebBalance && (
              <OebThresholdIndicator balance={oebBalance} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Supply Summary */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Totaal Nutriëntenaanbod</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{result.totalSupply.dryMatterKg.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">kg Droge Stof</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-amber-600">{Math.round(result.totalSupply.vem).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">VEM</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-emerald-600">{Math.round(result.totalSupply.dveGrams)}</p>
              <p className="text-xs text-muted-foreground">g DVE</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
