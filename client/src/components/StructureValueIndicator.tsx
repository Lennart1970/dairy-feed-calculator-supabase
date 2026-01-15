import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, Wheat } from "lucide-react";
import type { StructureValueResult } from "@/lib/calculator";

interface StructureValueIndicatorProps {
  structureValue: StructureValueResult;
}

export default function StructureValueIndicator({ structureValue }: StructureValueIndicatorProps) {
  const { swPerKgDs, requirement, status, message } = structureValue;
  
  // Calculate percentage for progress bar (cap at 150% for display)
  const percentage = Math.min((swPerKgDs / requirement) * 100, 150);
  
  // Status colors and icons
  const statusConfig = {
    ok: {
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      barColor: "bg-green-500",
      badgeVariant: "default" as const,
      badgeClass: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      barColor: "bg-amber-500",
      badgeVariant: "secondary" as const,
      badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    },
    deficient: {
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      barColor: "bg-red-500",
      badgeVariant: "destructive" as const,
      badgeClass: "bg-red-100 text-red-800 hover:bg-red-100",
    },
  };
  
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  
  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wheat className={`h-5 w-5 ${config.color}`} />
          <span>Structuurwaarde (SW)</span>
          <Badge className={config.badgeClass}>
            {status === 'ok' ? 'Voldoende' : status === 'warning' ? 'Marginaal' : 'Onvoldoende'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main SW value display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold flex items-baseline gap-1">
              <span className={config.color}>{swPerKgDs.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground font-normal">/ kg DS</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Minimale eis: ≥ {requirement.toFixed(2)}
            </p>
          </div>
          <StatusIcon className={`h-12 w-12 ${config.color}`} />
        </div>
        
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="font-medium">Min: 1.00</span>
            <span>1.5</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
            {/* Minimum requirement marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-gray-600 z-10"
              style={{ left: `${(1.0 / 1.5) * 100}%` }}
            />
            {/* Progress bar */}
            <div 
              className={`h-full ${config.barColor} transition-all duration-500`}
              style={{ width: `${(swPerKgDs / 1.5) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Status message */}
        <div className={`flex items-start gap-2 p-3 rounded-lg ${config.bgColor}`}>
          <StatusIcon className={`h-5 w-5 ${config.color} mt-0.5 flex-shrink-0`} />
          <div>
            <p className={`font-medium ${config.color}`}>{message}</p>
            {status !== 'ok' && (
              <p className="text-sm text-muted-foreground mt-1">
                {status === 'warning' 
                  ? 'Overweeg meer ruwvoer of langere haksellengte.'
                  : 'Verhoog direct het ruwvoeraandeel om pensacidose te voorkomen.'}
              </p>
            )}
          </div>
        </div>
        
        {/* Explanation */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-medium mb-1">Wat is Structuurwaarde?</p>
          <p>
            SW geeft aan hoeveel een voedermiddel de penswerking stimuleert. 
            Een rantsoen met SW ≥ 1.00 voorkomt pensacidose en bevordert herkauwactiviteit.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
