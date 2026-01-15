import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, ClipboardCheck, CheckCircle2, AlertTriangle, XCircle, Download } from "lucide-react";
import { type MprData } from "./MprInput";

interface MprValidationProps {
  mprData: MprData;
  totalSupply?: {
    vem: number;
    dveGrams: number;
  };
}

/**
 * Get ureum status and recommendation
 */
function getUreumStatus(ureum: number): {
  status: 'ok' | 'low' | 'high';
  icon: typeof CheckCircle2;
  color: string;
  bg: string;
  message: string;
} {
  if (ureum < 18) {
    return {
      status: 'low',
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30',
      message: 'Eiwittekort in de pens - verhoog eiwitrijke brok of raapzaadschroot',
    };
  }
  if (ureum > 25) {
    return {
      status: 'high',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      message: 'Overschot aan onbestendig eiwit (OEB te hoog) - kies brok met minder eiwit of meer snelle energie',
    };
  }
  return {
    status: 'ok',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    message: 'Optimale stikstofbenutting - rantsoen is in balans',
  };
}

/**
 * MprValidation component - Shows only validation results (FCM, ureum status)
 * Used on Page 5 (MPR Validatie step)
 */
export default function MprValidation({ mprData, totalSupply }: MprValidationProps) {
  const { milkProduction, fatPercent, proteinPercent, ureum, fcm } = mprData;
  const ureumStatus = getUreumStatus(ureum);
  const UreumIcon = ureumStatus.icon;

  // Calculate VEM and DVE requirements from FCM
  const vemRequirement = fcm ? 442 * fcm + 5000 : 0;
  const dveRequirement = fcm ? 1.396 * (milkProduction * (proteinPercent / 100) * 1000) + 350 : 0;

  // Calculate coverage percentages
  const vemCoverage = totalSupply && vemRequirement > 0 ? (totalSupply.vem / vemRequirement) * 100 : 0;
  const dveCoverage = totalSupply && dveRequirement > 0 ? (totalSupply.dveGrams / dveRequirement) * 100 : 0;

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-950/40 dark:to-violet-950/20 border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
              5
            </div>
            <div>
              <span className="text-purple-700 dark:text-purple-400">MPR Validatie</span>
              <span className="text-muted-foreground font-normal text-sm ml-2">— De Keurmeester</span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:hover:bg-purple-900/70 dark:text-purple-300 print:hidden"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF Exporteren
            </Button>
            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300">
              Controle
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Validatie van het rantsoen op basis van MPR-uitslagen. Het ureumgehalte is dé graadmeter voor stikstofbenutting.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Summary */}
        <div className="grid grid-cols-4 gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Melk</div>
            <div className="text-lg font-bold">{milkProduction} kg/d</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Vet</div>
            <div className="text-lg font-bold">{fatPercent}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Eiwit</div>
            <div className="text-lg font-bold">{proteinPercent}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Ureum</div>
            <div className="text-lg font-bold">{ureum} mg/100ml</div>
          </div>
        </div>

        {/* FCM Result */}
        <div className="p-4 rounded-lg bg-purple-100/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-900 dark:text-purple-100">
                FCM (Fat Corrected Milk)
              </span>
            </div>
            <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {fcm.toFixed(1)} kg
            </span>
          </div>
          <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-2 font-mono">
            = (0.337 + 0.116 × {fatPercent} + 0.06 × {proteinPercent}) × {milkProduction}
          </p>
        </div>

        {/* VEM/DVE Coverage based on FCM */}
        {totalSupply && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              Dekking op basis van FCM
            </div>
            
            {/* VEM Coverage */}
            <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">VEM Dekking</span>
                <span className={`text-sm font-bold ${vemCoverage >= 95 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {vemCoverage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${vemCoverage >= 95 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, vemCoverage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Aanbod: {totalSupply.vem.toLocaleString()}</span>
                <span>Behoefte: {Math.round(vemRequirement).toLocaleString()}</span>
              </div>
            </div>

            {/* DVE Coverage */}
            <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">DVE Dekking</span>
                <span className={`text-sm font-bold ${dveCoverage >= 95 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {dveCoverage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${dveCoverage >= 95 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, dveCoverage)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Aanbod: {totalSupply.dveGrams.toFixed(0)}g</span>
                <span>Behoefte: {Math.round(dveRequirement)}g</span>
              </div>
            </div>
          </div>
        )}

        {/* Ureum Traffic Light */}
        <div className={`p-4 rounded-lg ${ureumStatus.bg} border ${
          ureumStatus.status === 'ok' ? 'border-emerald-200 dark:border-emerald-800' :
          ureumStatus.status === 'low' ? 'border-red-200 dark:border-red-800' :
          'border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              ureumStatus.status === 'ok' ? 'bg-emerald-200 dark:bg-emerald-800' :
              ureumStatus.status === 'low' ? 'bg-red-200 dark:bg-red-800' :
              'bg-amber-200 dark:bg-amber-800'
            }`}>
              <UreumIcon className={`w-5 h-5 ${ureumStatus.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm">Ureum Beoordeling</span>
                <span className={`text-lg font-bold ${ureumStatus.color}`}>
                  {ureum} mg/100ml
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{ureumStatus.message}</p>
            </div>
          </div>
          
          {/* Ureum Scale */}
          <div className="mt-4">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div className="w-1/3 bg-red-400" title="< 18: Te laag"></div>
              <div className="w-1/3 bg-emerald-400" title="18-25: Optimaal"></div>
              <div className="w-1/3 bg-amber-400" title="> 25: Te hoog"></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span>18</span>
              <span>25</span>
              <span>40+</span>
            </div>
            {/* Indicator */}
            <div className="relative h-4 mt-1">
              <div 
                className="absolute w-3 h-3 bg-slate-800 dark:bg-white rounded-full border-2 border-white dark:border-slate-800 shadow-md transform -translate-x-1/2"
                style={{ left: `${Math.min(100, Math.max(0, (ureum / 40) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-3 rounded-lg bg-purple-100/30 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/50">
          <div className="flex items-start gap-2">
            <ClipboardCheck className="w-4 h-4 text-purple-600 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-purple-700 dark:text-purple-400">De Gouden Regel: </span>
              <span className="text-muted-foreground">
                "Meten is weten" - De ruwvoeruitslag is de begroting, de melkuitslag is de eindrekening waarmee je het plan voor de volgende periode verfijnt.
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
