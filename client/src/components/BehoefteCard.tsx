import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type MprData } from "@/components/MprInput";
import MprInputFields from "@/components/MprInputFields";
import DierprofielFields from "@/components/DierprofielFields";
import { Target } from "lucide-react";

interface BehoefteCardProps {
  mprData: MprData | null;
  onMprChange: (data: MprData) => void;
  onProfileChange: (profile: any) => void;
  initialProfileName?: string | null;
  parity: number;
  daysInMilk: number;
  daysPregnant: number;
  onParityChange: (value: number) => void;
  onDaysInMilkChange: (value: number) => void;
  onDaysPregnantChange: (value: number) => void;
}

export default function BehoefteCard({
  mprData,
  onMprChange,
  onProfileChange,
  initialProfileName,
  parity,
  daysInMilk,
  daysPregnant,
  onParityChange,
  onDaysInMilkChange,
  onDaysPregnantChange,
}: BehoefteCardProps) {
  const handleProfileChange = useCallback((profile: any) => {
    onProfileChange(profile?.name || null);
  }, [onProfileChange]);

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-b border-blue-200 dark:border-blue-800">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
            2
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-900 dark:text-blue-100">Behoefte</span>
            </div>
            <p className="text-sm font-normal text-muted-foreground mt-1">
              Bepaal de voedingsbehoefte op basis van melkproductie en dierprofiel
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Section A: MPR Uitslagen */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              A
            </div>
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">
              MPR Uitslagen
              <span className="text-muted-foreground font-normal text-sm ml-2">— Melkproductie Registratie</span>
            </h3>
          </div>
          <MprInputFields onMprChange={onMprChange} />
        </div>

        {/* Section B: Dierprofiel */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              B
            </div>
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">
              Dierprofiel
              <span className="text-muted-foreground font-normal text-sm ml-2">— Dierkenmerken</span>
            </h3>
          </div>
          <DierprofielFields
            initialProfileName={initialProfileName}
            onProfileChange={handleProfileChange}
            mprData={mprData}
          />
        </div>

        {/* Section C: Fysiologische Parameters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              C
            </div>
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">
              Fysiologische Parameters
              <span className="text-muted-foreground font-normal text-sm ml-2">— Voor VOC & VEM toeslagen</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            {/* Parity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Pariteit (Lactatie)
              </label>
              <select
                value={parity}
                onChange={(e) => onParityChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md bg-white dark:bg-slate-900 text-sm"
              >
                <option value={1}>1 (Eerste lactatie / Vaars)</option>
                <option value={2}>2 (Tweede lactatie)</option>
                <option value={3}>3+ (Volwassen koe)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {parity === 1 && "Jeugdgroei: +630 VEM/dag"}
                {parity === 2 && "Jeugdgroei: +330 VEM/dag"}
                {parity >= 3 && "Geen groeitoeslag"}
              </p>
            </div>

            {/* Days in Milk */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Dagen in Melk (DIM)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={daysInMilk}
                onChange={(e) => onDaysInMilkChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md bg-white dark:bg-slate-900 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {daysInMilk < 60 && "Vroege lactatie (lage opname)"}
                {daysInMilk >= 60 && daysInMilk < 200 && "Midden lactatie (piek opname)"}
                {daysInMilk >= 200 && "Late lactatie"}
              </p>
            </div>

            {/* Days Pregnant */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Dagen Drachtig
              </label>
              <input
                type="number"
                min="0"
                max="283"
                value={daysPregnant}
                onChange={(e) => onDaysPregnantChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md bg-white dark:bg-slate-900 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {daysPregnant === 0 && "Niet drachtig"}
                {daysPregnant > 0 && daysPregnant <= 190 && "Drachtig (geen toeslag)"}
                {daysPregnant > 190 && daysPregnant <= 220 && "Drachtig: +1000 VEM/dag"}
                {daysPregnant > 220 && daysPregnant <= 250 && "Drachtig: +2000 VEM/dag"}
                {daysPregnant > 250 && "Drachtig: +3000 VEM/dag"}
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>ℹ️ Info:</strong> Deze parameters worden gebruikt voor:
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 ml-4 space-y-0.5">
              <li>• <strong>VOC berekening</strong> - Opnamecapaciteit (hoeveel de koe kan eten)</li>
              <li>• <strong>VEM toeslagen</strong> - Dracht (exponentieel) & groei (jeugdgroei)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { MprData };
