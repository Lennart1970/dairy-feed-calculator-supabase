import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { VOCResult } from "@/lib/calculator";

interface VOCIndicatorProps {
  vocResult: VOCResult;
}

export default function VOCIndicator({ vocResult }: VOCIndicatorProps) {
  const { vocCapacity, totalVW, saturationPercent, status, message } = vocResult;
  
  // Determine color scheme based on status
  const getStatusColor = () => {
    switch (status) {
      case 'ok':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          border: 'border-emerald-500',
          text: 'text-emerald-700 dark:text-emerald-400',
          badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300',
          icon: CheckCircle2,
          progressColor: 'bg-emerald-500',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          border: 'border-amber-500',
          text: 'text-amber-700 dark:text-amber-400',
          badgeBg: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300',
          icon: AlertTriangle,
          progressColor: 'bg-amber-500',
        };
      case 'exceeded':
        return {
          bg: 'bg-red-50 dark:bg-red-950/40',
          border: 'border-red-500',
          text: 'text-red-700 dark:text-red-400',
          badgeBg: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-300',
          icon: AlertTriangle,
          progressColor: 'bg-red-500',
        };
    }
  };
  
  const colors = getStatusColor();
  const StatusIcon = colors.icon;
  
  return (
    <Card className={`border-0 shadow-lg bg-gradient-to-br from-${colors.bg} border-l-4 ${colors.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${colors.text}`} />
            <span className={colors.text}>Opnamecapaciteit (VOC)</span>
          </CardTitle>
          <Badge variant="outline" className={colors.badgeBg}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status === 'ok' ? 'OK' : status === 'warning' ? 'Let op' : 'Overschreden'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Voeropnamecapaciteit (VOC) gebaseerd op lactatie, dagen in melk en dracht. Voorkomt te verzadigende rantsoenen.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* VOC Capacity and VW */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <p className="text-xs text-muted-foreground mb-1">VOC Capaciteit</p>
            <p className={`text-lg font-bold ${colors.text}`}>{vocCapacity} kg DS</p>
          </div>
          <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <p className="text-xs text-muted-foreground mb-1">Totaal VW</p>
            <p className={`text-lg font-bold ${colors.text}`}>{totalVW}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/50 dark:bg-slate-800/50">
            <p className="text-xs text-muted-foreground mb-1">Verzadiging</p>
            <p className={`text-lg font-bold ${colors.text}`}>{saturationPercent}%</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Verzadigingsgraad</span>
            <span className={`font-medium ${colors.text}`}>{saturationPercent}%</span>
          </div>
          <div className="relative">
            <Progress value={Math.min(saturationPercent, 100)} className="h-3" />
            <div 
              className={`absolute top-0 left-0 h-3 rounded-full ${colors.progressColor} transition-all`}
              style={{ width: `${Math.min(saturationPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* Status Message */}
        <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
          <div className="flex items-start gap-2">
            <StatusIcon className={`w-4 h-4 mt-0.5 ${colors.text}`} />
            <p className="text-sm">{message}</p>
          </div>
        </div>
        
        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <Info className="w-4 h-4 mt-0.5 text-blue-600" />
          <p className="text-xs text-muted-foreground">
            <strong>VOC (Voeropnamecapaciteit):</strong> De maximale hoeveelheid droge stof die een koe kan opnemen, 
            afhankelijk van lactatie, dagen in melk en dracht. VW (Verzadigingswaarde) meet hoe verzadigend elk voer is.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
